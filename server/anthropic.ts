import Anthropic from '@anthropic-ai/sdk';
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { Wine } from '@shared/schema';

// Initialize Anthropic client with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Extract wine information from a label image using Claude Vision
 */
export async function analyzeWineLabel(imageBase64: string) {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a wine expert. Analyze this wine label image and extract as much information as possible. 
              Return the information in JSON format with these fields (include null if information is not available):
              {
                "producer": string,
                "name": string,
                "vintage": number or null,
                "region": string or null,
                "subregion": string or null,
                "country": string or null,
                "grapeVarieties": string or null,
                "type": "Red" | "White" | "Rosé" | "Sparkling" | "Dessert" | "Fortified" | "Other",
                "alcoholContent": number or null,
                "confidence": number (0-1 indicating confidence in your analysis),
                "recommendedDrinkingWindow": {
                  "startYear": number,
                  "endYear": number,
                  "notes": string,
                  "isPastPrime": boolean
                }
              }
              
              For the recommendedDrinkingWindow, use your expertise on wine aging potential based on the producer, vintage, region, and grape varieties. Calculate when the wine will be at its best drinking period. For example, many Bordeaux reds need 10-20 years to mature while Beaujolais are often best consumed young. If the wine is already past its prime drinking window, set isPastPrime to true.`
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }
      ],
      temperature: 0.2, // Low temperature for more consistent results
    });

    // Extract text content from the response
    if (response.content[0].type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    const text = response.content[0].text;
    
    // Find the JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not extract JSON data from the API response');
    }
    
    // Parse the extracted JSON
    const wineData = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: wineData
    };
  } catch (error) {
    console.error('Error analyzing wine label:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Handle image upload, save temporarily, and analyze with Anthropic
 */
export async function handleWineLabelAnalysis(req: Request, res: Response) {
  try {
    // Check if request contains file data
    if (!req.body || !req.body.imageData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image data provided' 
      });
    }

    // Extract the base64 data from the request
    let base64Data = req.body.imageData;
    
    // Remove the data URL prefix if present (e.g., "data:image/jpeg;base64,")
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    console.log('Starting wine label analysis with Claude API...');
    
    // Analyze the wine label using Claude
    const analysisResult = await analyzeWineLabel(base64Data);
    
    console.log('Wine label analysis result:', 
      analysisResult.success ? 'Success' : 'Failed', 
      analysisResult.success ? analysisResult.data : analysisResult.error
    );

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: analysisResult.error || 'Failed to analyze wine label'
      });
    }

    // Return the wine data
    return res.status(200).json({
      success: true,
      data: analysisResult.data
    });
  } catch (error) {
    console.error('Error in wine label analysis handler:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
}

// Define the recommendation interface for type safety
interface Recommendation {
  wineId: number;
  wine: string;
  reasoning: string;
  characteristics: string;
  servingSuggestions: string;
  ageConsiderations: string;
  confidenceScore: number;
}

interface RecommendationData {
  recommendations: Recommendation[];
  additionalSuggestions: string;
}

/**
 * Intelligent wine recommendation based on food pairing or occasion
 */
export async function getWineRecommendations(query: string, wines: Wine[]) {
  try {
    // Convert the wine collection to a simplified format for Claude
    const wineCollection = wines.map(wine => ({
      id: wine.id,
      name: wine.name,
      producer: wine.producer,
      vintage: wine.vintage,
      type: wine.type,
      region: wine.region,
      subregion: wine.subregion,
      grapeVarieties: wine.grapeVarieties,
      drinkingStatus: wine.drinkingStatus,
      notes: wine.notes,
    }));

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert master sommelier and wine advisor with deep knowledge of wine regions, producers, vintages, grape varietals, and food pairings. Based on the following user query, recommend specific wines from their personal collection that would be appropriate.

USER QUERY: "${query}"

WINE COLLECTION:
${JSON.stringify(wineCollection, null, 2)}

Please analyze the user's query to understand what kind of occasion, food pairing, or experience they're looking for. Then recommend 1-5 wines from their collection that would be ideal.

For each recommendation, provide EXTREMELY DETAILED wine-specific analysis. Your response must include:
1. Wine-specific grape variety information (e.g., "This Syrah from Sonoma features peppery notes and smoky characteristics that mirror your smoked steak preparation")
2. Producer-specific details about winemaking style and techniques
3. Vintage-specific characteristics for this exact year
4. Region-specific terroir influences that make this wine perfect for the query
5. Specific tannin, acid, alcohol balance in THIS wine (not generic wine type)
6. Exact flavor compounds that interact with the food in the query

EXAMPLES OF GOOD REASONING:
- For steak: "The 2019 Di Costanzo Cabernet from Napa is perfect for your smoked tomahawk because this producer's style emphasizes graphite and tobacco notes that complement smoky meat. The 2019 vintage had ideal ripening conditions creating wines with integrated tannins that can stand up to the rich fat in the steak cut."
- For seafood: "This 2018 Tiberio white is ideal because of its high natural acidity from limestone soils and the cooler 2018 growing season, which enhances the wine's minerality - perfect for cutting through your butter sauce."

NEVER provide generic wine type information. Everything must be specific to this exact wine, producer, vintage, and region.

If the wine has grape varieties listed, incorporate this information. If not, research-based grape knowledge for the region/type is essential (e.g., if it's a Napa red without grape listed, analyze as if Cabernet Sauvignon; if Burgundy, as Pinot Noir, etc.)

Treat every recommendation as if you're a specialized expert on THAT SPECIFIC WINE, having tasted it and knowing the producer's philosophy and practices.

Your response MUST be a valid JSON object with this exact format:
{
  "recommendations": [
    {
      "wineId": number,
      "wine": "string value",
      "reasoning": "string value",
      "characteristics": "string value",
      "servingSuggestions": "string value",
      "ageConsiderations": "string value",
      "confidenceScore": number
    }
  ],
  "additionalSuggestions": "string value"
}`
            }
          ]
        }
      ],
      temperature: 0.7, // Slightly higher temperature for more creative recommendations
    });

    // Extract text content from the response
    if (response.content[0].type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    const text = response.content[0].text;
    
    // Find the JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not extract JSON data from the API response');
    }
    
    try {
      // Parse the extracted JSON
      let jsonString = jsonMatch[0];
      
      // Perform additional cleanup and validation to ensure valid JSON
      // Replace any invalid escape sequences
      jsonString = jsonString.replace(/\\\\/g, '\\')
                          .replace(/\\'/g, "'")
                          .replace(/\\"/g, '"')
                          .replace(/\n/g, '\\n')
                          .replace(/\r/g, '\\r')
                          .replace(/\t/g, '\\t');
      
      // Create a fallback recommendation if JSON parsing fails
      let recommendationData: RecommendationData;
      try {
        recommendationData = JSON.parse(jsonString);
      } catch (jsonError) {
        console.error('Error parsing JSON from Claude, attempting to fix:', jsonError);
        
        // Create a fallback response based on query analysis
        // We'll analyze the query to provide relevant recommendations rather than
        // making assumptions about wine types
        
        const fallbackRecs: Recommendation[] = [];
        const queryLower = query.toLowerCase();
        
        // Basic query keyword analysis
        const isSteak = queryLower.includes('steak') || queryLower.includes('beef') || queryLower.includes('tomahawk');
        const isSeafood = queryLower.includes('fish') || queryLower.includes('seafood') || queryLower.includes('salmon');
        const isSpicy = queryLower.includes('spicy') || queryLower.includes('hot') || queryLower.includes('chili');
        const isDessert = queryLower.includes('dessert') || queryLower.includes('sweet') || queryLower.includes('chocolate');
        const isCelebration = queryLower.includes('celebration') || queryLower.includes('anniversary') || queryLower.includes('special');
        
        // Scoring function to rank wines for this specific query - use arrow function to avoid strict mode issue
        const scoreWineForQuery = (wine: any): number => {
          let score = 0.5; // Start with neutral score
          
          // Type matching for food pairing
          if (isSteak && wine.type?.toLowerCase() === 'red') score += 0.15;
          if (isSeafood && wine.type?.toLowerCase() === 'white') score += 0.15;
          if (isSpicy && (wine.type?.toLowerCase() === 'white' || wine.type?.toLowerCase() === 'rosé')) score += 0.1;
          if (isDessert && (wine.type?.toLowerCase() === 'dessert' || wine.type?.toLowerCase() === 'sparkling')) score += 0.15;
          if (isCelebration && wine.type?.toLowerCase() === 'sparkling') score += 0.15;
          
          // Special region considerations
          if (isSteak && wine.region?.toLowerCase().includes('bordeaux')) score += 0.05;
          if (isSteak && wine.region?.toLowerCase().includes('napa')) score += 0.05;
          if (isSeafood && wine.region?.toLowerCase().includes('burgundy')) score += 0.05;
          if (isSeafood && wine.region?.toLowerCase().includes('loire')) score += 0.05;
          
          // Vintage considerations (newer wines may be more approachable)
          if (wine.vintage && wine.vintage > 2018) score += 0.05;
          
          // Limit maximum score
          return Math.min(score, 0.85);
        }
        
        // Score and sort all wines based on the query
        const scoredWines = wineCollection.map(wine => ({
          wine,
          score: scoreWineForQuery(wine)
        })).sort((a, b) => b.score - a.score);
        
        // Take the top 2-3 wines as recommendations
        const topWines = scoredWines.slice(0, Math.min(3, scoredWines.length));
        
        // Create recommendations from top-scored wines
        topWines.forEach(({ wine: wineObj, score }) => {
          // Build detailed reasoning based on the query, wine type, region, vintage, and producer
          let reasoning = `Based on your query about "${query}", `;
          
          // Determine likely grape varieties based on region and type
          let grapeVariety = "unspecified grape variety";
          if (wineObj.grapeVarieties) {
            grapeVariety = wineObj.grapeVarieties;
          } else if (wineObj.region?.toLowerCase().includes('napa') && wineObj.type?.toLowerCase() === 'red') {
            grapeVariety = "Cabernet Sauvignon";
          } else if (wineObj.region?.toLowerCase().includes('burgundy') && wineObj.type?.toLowerCase() === 'red') {
            grapeVariety = "Pinot Noir";
          } else if (wineObj.region?.toLowerCase().includes('sonoma') && wineObj.type?.toLowerCase() === 'red') {
            grapeVariety = "likely Syrah or Zinfandel";
          } else if (wineObj.region?.toLowerCase().includes('bordeaux') && wineObj.type?.toLowerCase() === 'red') {
            grapeVariety = "Cabernet and Merlot blend";
          } else if (wineObj.region?.toLowerCase().includes('piedmont') && wineObj.type?.toLowerCase() === 'red') {
            grapeVariety = "Nebbiolo";
          } else if (wineObj.region?.toLowerCase().includes('tuscany') && wineObj.type?.toLowerCase() === 'red') {
            grapeVariety = "Sangiovese";
          }
          
          // Wine-specific production style based on producer
          let producerStyle = "";
          if (wineObj.producer?.toLowerCase().includes('di costanzo')) {
            producerStyle = "Di Costanzo is known for producing elegant, terroir-driven Cabernet Sauvignon with a European sensibility rather than the typical rich Napa style. Winemaker Massimo Di Costanzo focuses on structure and balance.";
          } else if (wineObj.producer?.toLowerCase().includes('corison')) {
            producerStyle = "Corison wines, made by pioneering winemaker Cathy Corison, are renowned for their elegance, balance and ageability. Her Cabernets show restraint with bright acidity and moderate alcohol.";
          } else if (wineObj.producer?.toLowerCase().includes('pax')) {
            producerStyle = "Pax Mahle specializes in cool-climate Syrah with distinctive savory, peppery, and smoky characteristics. These wines offer complexity with moderate alcohol levels and excellent structure.";
          } else if (wineObj.producer?.toLowerCase().includes('tiberio')) {
            producerStyle = "Tiberio is focused on showcasing the indigenous varieties of Abruzzo, Italy. The wines show exceptional mineral precision and clarity from limestone-rich soils.";
          } else if (wineObj.producer?.toLowerCase().includes('adamvs')) {
            producerStyle = "ADAMVS crafts Cabernet Sauvignon from their organic and biodynamic estate on Howell Mountain in Napa Valley, producing wines of intensity, structure and age-worthiness.";
          } else if (wineObj.producer?.toLowerCase().includes('newfound')) {
            producerStyle = "Newfound Wines specializes in minimal-intervention, site-specific wines that emphasize purity and transparency, often working with Grenache, Mourvedre, and other Rhône varieties.";
          }
          
          // Specific vintage characteristics
          let vintageCharacteristics = "";
          if (wineObj.vintage && wineObj.region) {
            if (wineObj.region.toLowerCase().includes('napa') && wineObj.vintage === 2019) {
              vintageCharacteristics = "The 2019 vintage in Napa Valley was exceptional, with a long, mild growing season that allowed for optimal ripening while maintaining freshness and acidity. This produced wines with remarkable balance and concentration.";
            } else if (wineObj.region.toLowerCase().includes('napa') && wineObj.vintage === 2018) {
              vintageCharacteristics = "2018 was a cooler year in Napa with a long growing season, producing more elegant wines with moderate alcohol and fresh acidity.";
            } else if (wineObj.region.toLowerCase().includes('sonoma') && wineObj.vintage === 2019) {
              vintageCharacteristics = "2019 in Sonoma was marked by moderate temperatures and even ripening, resulting in wines with excellent concentration and balanced acidity.";
            } else if (wineObj.region.toLowerCase().includes('sonoma') && wineObj.vintage === 2018) {
              vintageCharacteristics = "The 2018 vintage in Sonoma was cooler than normal, leading to slower ripening and wines with excellent structure and aromatics.";
            } else if (wineObj.vintage > 2020) {
              vintageCharacteristics = `The ${wineObj.vintage} vintage is relatively young, showing primary fruit flavors and youthful tannins.`;
            } else if (wineObj.vintage > 2015) {
              vintageCharacteristics = `The ${wineObj.vintage} vintage has had some time to develop but maintains freshness with evolving complexity.`;
            } else {
              vintageCharacteristics = `The ${wineObj.vintage} vintage has had significant time to mature, likely showing tertiary aromas and flavors.`;
            }
          }
          
          // Build the specific recommendation reasoning
          if (isSteak) {
            reasoning += `this ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} would be an excellent match for your steak. This wine is made from ${grapeVariety}, which offers structure and complexity that pairs beautifully with smoked meat. ${producerStyle} ${vintageCharacteristics} The wine's tannins will cut through the fat of the tomahawk steak, while its fruit characteristics will complement the smoky flavors from the grill.`;
          } else if (isSeafood) {
            reasoning += `this ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} would complement your seafood beautifully. Made from ${grapeVariety}, this wine has the precise acidity and minerality needed for seafood pairings. ${producerStyle} ${vintageCharacteristics} The wine's brightness and subtle flavors won't overpower your delicate seafood dish.`;
          } else if (isSpicy) {
            reasoning += `this ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} would balance well with your spicy food. Made from ${grapeVariety}, this wine has characteristics that can tame heat while enhancing flavors. ${producerStyle} ${vintageCharacteristics} The wine's fruit profile and moderate alcohol will soothe the palate between bites of spicy food.`;
          } else if (isCelebration) {
            reasoning += `this ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} would be perfect for your special occasion. Made from ${grapeVariety}, this wine has the complexity and elegance worthy of a celebration. ${producerStyle} ${vintageCharacteristics} The wine's quality and character will create memorable moments for your special event.`;
          } else {
            reasoning += `this ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} would be an excellent choice for your meal. Made from ${grapeVariety}, this wine offers a balance of flavors that should complement your dining experience. ${producerStyle} ${vintageCharacteristics}`;
          }
          
          // Generate specific characteristics based on wine type, region, and grape
          let characteristics = "";
          let servingSuggestions = "";
          
          if (wineObj.type?.toLowerCase() === 'red') {
            if (grapeVariety.includes("Cabernet")) {
              characteristics = `This ${grapeVariety} from ${wineObj.region || "its region"} likely offers dark fruit notes like cassis and blackberry, along with secondary notes of cedar, graphite, and possibly tobacco. ${producerStyle} The wine shows structured tannins that will help cut through the richness of steak, with enough complexity to stand up to bold flavors.`;
              servingSuggestions = "Decant for 30-45 minutes and serve at 60-65°F (16-18°C) in a large Bordeaux-style glass. The broad bowl will help open up the complex aromas while the slight chill will emphasize the wine's freshness.";
            } else if (grapeVariety.includes("Syrah") || grapeVariety.includes("Zinfandel")) {
              characteristics = `This ${grapeVariety} from ${wineObj.region || "its region"} offers bold, spicy characteristics with notes of black pepper, blackberry, and often a distinctive smokiness that mirrors your grilled preparations. ${producerStyle} The wine's mix of fruit and savory qualities makes it particularly versatile with various meat dishes.`;
              servingSuggestions = "Serve at 60-65°F (16-18°C) in a Rhône-style glass. Consider decanting for 20-30 minutes to fully express the wine's aromatic complexity.";
            } else if (grapeVariety.includes("Pinot")) {
              characteristics = `This ${grapeVariety} from ${wineObj.region || "its region"} offers elegant red fruit notes like cherry and raspberry, with subtle earthy undertones and silky tannins. ${producerStyle} The wine's higher acidity and medium body make it versatile with many foods.`;
              servingSuggestions = "Serve at 58-60°F (14-16°C) in a Burgundy-style glass with a wider bowl to capture the delicate aromas.";
            } else {
              characteristics = `This red wine made from ${grapeVariety} offers a structured profile with balanced fruit and savory notes. ${producerStyle} ${vintageCharacteristics} The wine's complexity will enhance your dining experience.`;
              servingSuggestions = "Serve slightly below room temperature (around 60-65°F/16-18°C) in a red wine glass. Consider decanting for 20-30 minutes to allow the wine to open up.";
            }
          } else if (wineObj.type?.toLowerCase() === 'white') {
            characteristics = `This white wine made from ${grapeVariety} from ${wineObj.region || "its region"} offers bright acidity with notes of citrus, stone fruit, and subtle minerality. ${producerStyle} ${vintageCharacteristics} The wine's refreshing profile will complement your meal without overwhelming it.`;
            servingSuggestions = "Serve chilled around 45-50°F (7-10°C) in a white wine glass with a slightly narrower bowl to preserve aromatics.";
          } else if (wineObj.type?.toLowerCase() === 'sparkling') {
            characteristics = `This sparkling wine made from ${grapeVariety} from ${wineObj.region || "its region"} offers effervescence with notes of citrus, apple, and brioche. ${producerStyle} ${vintageCharacteristics} The wine's refreshing bubbles and acidity make it versatile with many foods and perfect for celebrations.`;
            servingSuggestions = "Serve well chilled at 42-45°F (6-7°C) in a flute or tulip glass to preserve bubbles while allowing aromas to develop.";
          } else {
            characteristics = `This wine made from ${grapeVariety} from ${wineObj.region || "its region"} offers a unique profile that should work well with your described meal or occasion. ${producerStyle} ${vintageCharacteristics}`;
            servingSuggestions = "Serve according to the wine type - chilled for white wines, room temperature for reds.";
          }
          
          // Age considerations based on vintage, grape and region
          let ageConsiderations = "";
          if (wineObj.vintage) {
            if (grapeVariety.includes("Cabernet") && wineObj.vintage > 2018) {
              ageConsiderations = `This ${wineObj.vintage} ${grapeVariety} is still relatively young. While approachable now, especially with decanting, it will continue to develop more complexity over the next 5-10 years. The primary fruit flavors are vibrant, with oak integration still in progress.`;
            } else if (grapeVariety.includes("Cabernet") && wineObj.vintage > 2015) {
              ageConsiderations = `This ${wineObj.vintage} ${grapeVariety} is entering its early drinking window. The tannins have softened somewhat while maintaining structure, and secondary flavors of leather and cedar may be emerging alongside the fruit.`;
            } else if (grapeVariety.includes("Pinot") && wineObj.vintage > 2018) {
              ageConsiderations = `This ${wineObj.vintage} Pinot Noir is showing youthful red fruit characteristics with vibrant acidity. While drinking well now, it will develop more complexity over the next 3-5 years as tertiary aromas emerge.`;
            } else if (wineObj.vintage > 2020) {
              ageConsiderations = `This ${wineObj.vintage} wine is quite young and showing primary fruit characteristics. ${grapeVariety} from this region typically needs some time to fully express itself, but the wine's youthful exuberance can be appealing with food.`;
            } else if (wineObj.vintage > 2015) {
              ageConsiderations = `This ${wineObj.vintage} wine has had some time to develop and should be showing a good balance between fruit and developing secondary characteristics. ${grapeVariety} from this vintage is currently in a good drinking window.`;
            } else {
              ageConsiderations = `This ${wineObj.vintage} wine has had significant time to develop complexity. ${grapeVariety} from this era should be showing tertiary aromas and flavors like dried fruit, leather, and earthy notes, with well-integrated tannins if a red wine.`;
            }
          } else {
            ageConsiderations = "Check the vintage to determine if it's at its optimal drinking window.";
          }
          
          fallbackRecs.push({
            wineId: wineObj.id,
            wine: `${wineObj.vintage || 'NV'} ${wineObj.producer} ${wineObj.name || ''}`.trim(),
            reasoning,
            characteristics,
            servingSuggestions,
            ageConsiderations,
            confidenceScore: score
          });
        });
        
        // If no wines were added (unlikely), add a generic recommendation using the first wine
        if (fallbackRecs.length === 0 && wineCollection.length > 0) {
          const firstWine = wineCollection[0];
          fallbackRecs.push({
            wineId: firstWine.id,
            wine: `${firstWine.vintage || 'NV'} ${firstWine.producer} ${firstWine.name || ''}`.trim(),
            reasoning: "This wine from your collection should work reasonably well with your meal.",
            characteristics: "Based on your collection, this appears to be a wine you enjoy, which is always a safe choice for any occasion.",
            servingSuggestions: "Serve according to the wine type - chilled for white wines, room temperature for reds.",
            ageConsiderations: "Check the vintage to determine if it's at its optimal drinking window.",
            confidenceScore: 0.6
          });
        }
        
        recommendationData = {
          recommendations: fallbackRecs,
          additionalSuggestions: "Our AI sommelier encountered a technical issue generating specific recommendations. These wines from your collection should pair reasonably well with your meal, though they may not be perfect matches. Try refining your query with more details about your food or occasion."
        };
      }
      
      // Validate and ensure all fields exist in each recommendation
      if (recommendationData.recommendations && Array.isArray(recommendationData.recommendations)) {
        recommendationData.recommendations = recommendationData.recommendations.map((rec: any): Recommendation => {
          return {
            wineId: typeof rec.wineId === 'number' ? rec.wineId : 0,
            wine: typeof rec.wine === 'string' ? rec.wine : "Unknown Wine",
            reasoning: typeof rec.reasoning === 'string' ? rec.reasoning : "No specific reasoning provided",
            characteristics: typeof rec.characteristics === 'string' ? rec.characteristics : "No characteristics available",
            servingSuggestions: typeof rec.servingSuggestions === 'string' ? rec.servingSuggestions : "Serve at room temperature in a standard wine glass",
            ageConsiderations: typeof rec.ageConsiderations === 'string' ? rec.ageConsiderations : "No specific age considerations provided",
            confidenceScore: typeof rec.confidenceScore === 'number' ? Math.min(Math.max(rec.confidenceScore, 0), 1) : 0.5
          };
        });
      } else {
        recommendationData.recommendations = [];
      }
      
      // If we still have empty recommendations after all processing, 
      // create query-relevant fallback recommendations based on the wine collection
      if (recommendationData.recommendations.length === 0 && wineCollection.length > 0) {
        console.log("No recommendations were generated, creating query-specific fallbacks from collection");
        
        // Analyze query for context
        const queryLower = query.toLowerCase();
        
        // Create a simple scoring system based on the query
        const scoreWineForQueryClosure = (wine: any): number => {
          let score = 0.5; // Base score
          
          // Look for keywords in the query
          if ((queryLower.includes('steak') || queryLower.includes('beef') || queryLower.includes('meat')) 
              && wine.type?.toLowerCase() === 'red') {
            score += 0.15;
          }
          if ((queryLower.includes('fish') || queryLower.includes('seafood')) 
              && wine.type?.toLowerCase() === 'white') {
            score += 0.15;
          }
          if ((queryLower.includes('dessert') || queryLower.includes('sweet')) 
              && (wine.type?.toLowerCase() === 'dessert' || wine.type?.toLowerCase() === 'sparkling')) {
            score += 0.15;
          }
          if ((queryLower.includes('celebration') || queryLower.includes('anniversary') || queryLower.includes('special')) 
              && wine.type?.toLowerCase() === 'sparkling') {
            score += 0.15;
          }
          
          return Math.min(score, 0.75);
        };
        
        let scoredWines = wineCollection.map(wine => {
          return { wine, score: scoreWineForQueryClosure(wine) };
        });
        
        // Sort by score and take the top one
        scoredWines.sort((a, b) => b.score - a.score);
        const topWineObj = scoredWines[0]; // This contains { wine, score }
        const wine = topWineObj.wine; // Extract just the wine
        
        // Create appropriate reasoning based on the query and wine
        let reasoning, characteristics, servingSuggestions, ageConsiderations;
        
        // Generate reasoning based on query
        if (queryLower.includes('steak') || queryLower.includes('beef')) {
          reasoning = `Based on your query about "${query}", this ${wine.type || ''} wine should complement your meal well.`;
        } else if (queryLower.includes('celebration') || queryLower.includes('anniversary')) {
          reasoning = `For your ${queryLower.includes('anniversary') ? 'anniversary' : 'celebration'}, this ${wine.type || ''} wine should be a good choice.`;
        } else {
          reasoning = `Based on your query about "${query}", this wine appears to be a reasonable match from your collection.`;
        }
        
        // Generate characteristics based on wine type
        if (wine.type?.toLowerCase() === 'red') {
          characteristics = "This red wine offers structure and flavors that should work well with your described meal.";
          servingSuggestions = "Serve slightly below room temperature (around a cool 60-65°F/16-18°C) in a red wine glass.";
        } else if (wine.type?.toLowerCase() === 'white') {
          characteristics = "This white wine offers freshness and acidity that should complement your meal.";
          servingSuggestions = "Serve chilled (around 45-50°F/7-10°C) in a white wine glass.";
        } else {
          characteristics = "This wine offers characteristics that should work reasonably well with your described meal or occasion.";
          servingSuggestions = "Serve according to the wine type - chilled for white wines, room temperature for reds.";
        }
        
        // Age considerations based on vintage
        if (wine.vintage && wine.vintage > 2020) {
          ageConsiderations = "This is a relatively young wine that should be showing fresh characteristics.";
        } else if (wine.vintage && wine.vintage > 2015) {
          ageConsiderations = "This wine has had some time to develop balance while maintaining freshness.";
        } else if (wine.vintage) {
          ageConsiderations = "This wine has had time to develop more complexity and secondary characteristics.";
        } else {
          ageConsiderations = "Check the vintage to determine if it's at its optimal drinking window.";
        }
        
        // Add the recommendation
        recommendationData.recommendations.push({
          wineId: wine.id,
          wine: `${wine.vintage || 'NV'} ${wine.producer} ${wine.name || ''}`.trim(),
          reasoning,
          characteristics,
          servingSuggestions,
          ageConsiderations,
          confidenceScore: topWineObj.score
        });
      }
      
      // Add a more helpful message
      if (!recommendationData.additionalSuggestions || recommendationData.additionalSuggestions.includes("couldn't generate detailed recommendations")) {
        recommendationData.additionalSuggestions = 
          "Based on your query, I've selected a wine from your collection that should work reasonably well. For more tailored recommendations, try providing more details about your meal, flavor preferences, or the occasion.";
      }
      
      if (!recommendationData.additionalSuggestions) {
        recommendationData.additionalSuggestions = "";
      }
      
      return {
        success: true,
        data: recommendationData
      };
    } catch (error: any) {
      console.error('Error processing recommendation data:', error);
      throw new Error(`Failed to process recommendation data: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error getting wine recommendations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Handle wine recommendation requests
 */
export async function handleWineRecommendations(req: Request, res: Response) {
  try {
    // Check if request contains query data
    if (!req.body || !req.body.query || !req.body.wines) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing query or wine collection' 
      });
    }

    const { query, wines } = req.body;
    
    console.log('Starting wine recommendation with Claude API...');
    
    // Get recommendations using Claude
    const recommendationResult = await getWineRecommendations(query, wines);
    
    console.log('Wine recommendation result:', 
      recommendationResult.success ? 'Success' : 'Failed'
    );

    if (!recommendationResult.success) {
      return res.status(500).json({
        success: false,
        error: recommendationResult.error || 'Failed to get wine recommendations'
      });
    }

    // Return the recommendation data
    return res.status(200).json({
      success: true,
      data: recommendationResult.data
    });
  } catch (error) {
    console.error('Error in wine recommendation handler:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
}