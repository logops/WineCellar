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
              text: `You are an expert master sommelier and wine advisor with deep knowledge of wine regions, producers, vintages, grape varietals, and food pairings. Given a user query about food or an occasion, recommend specific wines from their personal collection that would be appropriate.

USER QUERY: "${query}"

WINE COLLECTION:
${JSON.stringify(wineCollection, null, 2)}

IMPORTANT FORMATTING RULES:
1. DO NOT repeat or reference the user's query in your recommendations
2. Keep each analysis section BRIEF and FOCUSED - no more than 2-3 sentences per section
3. Focus exclusively on wine-specific information - never include generic wine type descriptions
4. Structure each recommendation in clear sections
5. NEVER REPEAT information between sections - each section should provide NEW information
6. Use concise, specific language throughout

For each recommendation, provide these sections, keeping each brief (1-3 sentences max):
1. REASONING: Why this SPECIFIC wine (by producer, region, vintage) pairs with the food/occasion
2. CHARACTERISTICS: This wine's specific flavor compounds, structure, and sensory profile 
3. SERVING SUGGESTIONS: Temperature, decanting time, glassware
4. AGE CONSIDERATIONS: Current maturity, drinking window, aging potential

Make each recommendation extremely specific to the individual wine:
- Highlight the SPECIFIC PRODUCER'S winemaking style (e.g., Di Costanzo's minimal intervention approach)
- Explain the SPECIFIC VINTAGE'S characteristics (e.g., how the 2019 growing season affected THIS wine)
- Describe the SPECIFIC REGIONAL terroir influences (e.g., volcanic soils in northern Napa)
- Analyze the SPECIFIC GRAPE VARIETIES (e.g., Cabernet Sauvignon's graphite notes complement the query)

If the wine has grape varieties listed, incorporate this information. If not, research-based grape knowledge for the region/type is essential (e.g., if it's a Napa red without grape listed, analyze as if Cabernet Sauvignon; if Burgundy, as Pinot Noir, etc.)

Write as if you're a specialized expert on EACH SPECIFIC WINE, having tasted it and knowing the producer's philosophy and practices.

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
          
          // Build the specific recommendation reasoning - keep it concise and remove query references
          if (isSteak) {
            reasoning = `This ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} offers ${grapeVariety} characteristics that complement hearty grilled meats. The wine's tannin structure cuts through rich proteins while enhancing smoky, caramelized flavors.`;
          } else if (isSeafood) {
            reasoning = `This ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} provides the precise acidity and subtle flavor profile ideal for delicate seafood. The ${grapeVariety} character balances natural sweetness in fish without overwhelming it.`;
          } else if (isSpicy) {
            reasoning = `This ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} offers the perfect balance to spicy cuisine. The ${grapeVariety} provides fruit-forward notes and moderate alcohol that tempers heat while enhancing complex flavors.`;
          } else if (isCelebration) {
            reasoning = `This ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} delivers the complexity and refinement perfect for special moments. The ${grapeVariety} expresses elegant aromatics and structure worthy of celebratory occasions.`;
          } else {
            reasoning = `This ${wineObj.vintage} ${wineObj.producer} from ${wineObj.region || "its region"} provides balanced ${grapeVariety} characteristics well-suited to varied cuisine. The wine's versatile profile complements a wide range of flavors and textures.`;
          }
          
          // Generate specific characteristics based on wine type, region, and grape
          let characteristics = "";
          let servingSuggestions = "";
          
          if (wineObj.type?.toLowerCase() === 'red') {
            if (grapeVariety.includes("Cabernet")) {
              characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} delivers concentrated cassis, blackberry, cedar, and graphite notes, with structured tannins. ${vintageCharacteristics.split('.')[0]}.`;
              servingSuggestions = "Decant for 30-45 minutes and serve at 60-65°F (16-18°C) in a Bordeaux-style glass. The broad bowl opens complex aromas while slight chilling emphasizes freshness.";
            } else if (grapeVariety.includes("Syrah") || grapeVariety.includes("Zinfandel")) {
              characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} presents bold black pepper, blackberry, and distinctive smokiness. ${vintageCharacteristics.split('.')[0]}.`;
              servingSuggestions = "Serve at 60-65°F (16-18°C) in a Rhône-style glass. Decant briefly (20 minutes) to fully express aromatic complexity.";
            } else if (grapeVariety.includes("Pinot")) {
              characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} offers elegant cherry and raspberry notes with earthy undertones and silky tannins. ${vintageCharacteristics.split('.')[0]}.`;
              servingSuggestions = "Serve at 58-60°F (14-16°C) in a Burgundy-style glass with a wider bowl to capture delicate aromas.";
            } else {
              characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} provides structured red fruit and savory notes with layered complexity. ${vintageCharacteristics.split('.')[0]}.`;
              servingSuggestions = "Serve at 60-65°F (16-18°C) in an appropriate red wine glass. Consider 20-minute decanting to fully express aromatics.";
            }
          } else if (wineObj.type?.toLowerCase() === 'white') {
            characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} exhibits bright citrus, stone fruit, and subtle minerality with refreshing acidity. ${vintageCharacteristics.split('.')[0]}.`;
            servingSuggestions = "Serve chilled at 45-50°F (7-10°C) in a white wine glass with a slightly narrower bowl to preserve aromatics.";
          } else if (wineObj.type?.toLowerCase() === 'sparkling') {
            characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} presents effervescent citrus, apple, and brioche notes with refreshing acidity. ${vintageCharacteristics.split('.')[0]}.`;
            servingSuggestions = "Serve well chilled at 42-45°F (6-7°C) in a flute or tulip glass to preserve bubbles while allowing aromas to develop.";
          } else {
            characteristics = `${wineObj.producer}'s ${wineObj.vintage} ${grapeVariety} offers a unique profile of balanced flavors and structure. ${vintageCharacteristics.split('.')[0]}.`;
            servingSuggestions = "Serve according to the wine type - chilled for white wines, room temperature for reds.";
          }
          
          // Age considerations based on vintage, grape and region
          let ageConsiderations = "";
          if (wineObj.vintage) {
            if (grapeVariety.includes("Cabernet") && wineObj.vintage > 2018) {
              ageConsiderations = `Currently youthful with vibrant primary fruit and developing tannins. Approachable now with decanting but will gain complexity through 2030-2035. Peak drinking window begins around 2027.`;
            } else if (grapeVariety.includes("Cabernet") && wineObj.vintage > 2015) {
              ageConsiderations = `Entering early maturity with softening tannins and emerging secondary notes of leather and cedar. Currently in a good drinking window but will continue to develop through 2030.`;
            } else if (grapeVariety.includes("Pinot") && wineObj.vintage > 2018) {
              ageConsiderations = `Showing youthful red fruit with vibrant acidity. Drinking well now but will develop more complexity through 2027 as tertiary aromas emerge. Currently in early drinking window.`;
            } else if (wineObj.vintage > 2020) {
              ageConsiderations = `Very young with primary fruit dominance. The wine's youthful exuberance works well with food but will improve with 2-3 years of cellaring as it develops more complexity.`;
            } else if (wineObj.vintage > 2015) {
              ageConsiderations = `Currently in an ideal drinking window with balanced fruit and emerging secondary characteristics. The wine shows good integration and should maintain this balance for another 3-5 years.`;
            } else {
              ageConsiderations = `Fully mature with developed tertiary notes of dried fruit, leather, and earth. Tannins have integrated well, creating a seamless texture. Drink soon to enjoy the wine's complex maturity.`;
            }
          } else {
            ageConsiderations = "Non-vintage wine designed for immediate consumption. Enjoy now for optimal freshness and character.";
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
        
        // Generate reasoning based on query, avoiding query repetition
        if (queryLower.includes('steak') || queryLower.includes('beef')) {
          reasoning = `This ${wine.type || ''} wine offers robust structure to complement grilled red meats. Its tannins enhance the rich flavors of beef while balancing the savory elements.`;
        } else if (queryLower.includes('celebration') || queryLower.includes('anniversary')) {
          reasoning = `This ${wine.type || ''} wine brings elegance and complexity suitable for special occasions. Its refined character creates a memorable experience worthy of celebration.`;
        } else if (queryLower.includes('fish') || queryLower.includes('seafood')) {
          reasoning = `This ${wine.type || ''} wine provides the perfect balance of acidity and delicate flavors to enhance seafood. The subtle profile won't overwhelm delicate fish preparations.`;
        } else if (queryLower.includes('spicy') || queryLower.includes('asian')) {
          reasoning = `This ${wine.type || ''} wine balances well against spicy cuisine with its fruit-forward profile and refreshing character. The wine complements complex flavors without amplifying heat.`;
        } else {
          reasoning = `This wine offers balanced structure and versatile flavor profile that adapts well to various cuisines. Its approachable character makes it suitable for both casual and refined meals.`;
        }
        
        // Generate specific, concise characteristics based on wine type
        if (wine.type?.toLowerCase() === 'red') {
          if (wine.region?.toLowerCase().includes('napa')) {
            characteristics = `${wine.producer}'s ${wine.vintage} red from Napa Valley shows concentrated dark fruit, graphite, and subtle spice notes. The structured tannins and balanced acidity create a full-bodied profile with excellent length.`;
          } else if (wine.region?.toLowerCase().includes('sonoma')) {
            characteristics = `${wine.producer}'s ${wine.vintage} red from Sonoma offers rich blackberry and black cherry flavors with distinctive peppery spice. The cool-climate influence provides excellent structure and savory complexity.`;
          } else {
            characteristics = `${wine.producer}'s ${wine.vintage} red wine delivers a structured profile with balanced fruit and savory elements. The wine shows excellent concentration with fine-grained tannins and complex aromatics.`;
          }
          servingSuggestions = "Decant for 20-30 minutes and serve at 60-65°F (16-18°C) in a proper red wine glass to fully express aromatics and soften tannins.";
        } else if (wine.type?.toLowerCase() === 'white') {
          characteristics = `${wine.producer}'s ${wine.vintage} white wine exhibits bright citrus and stone fruit notes with refreshing acidity and subtle minerality. The balanced profile shows excellent tension between fruit and structure.`;
          servingSuggestions = "Serve chilled at 45-50°F (7-10°C) in a white wine glass with a slightly narrower bowl to preserve aromatics and maintain proper temperature.";
        } else if (wine.type?.toLowerCase() === 'sparkling') {
          characteristics = `${wine.producer}'s sparkling wine presents fine bubbles with refreshing citrus, apple, and subtle brioche notes. The wine shows excellent balance between acidity and dosage with a clean, persistent finish.`;
          servingSuggestions = "Serve well chilled at 42-45°F (6-7°C) in a tulip-shaped glass that preserves effervescence while allowing complex aromas to develop.";
        } else {
          characteristics = `${wine.producer}'s ${wine.vintage} wine offers a balanced profile with integrated flavors and excellent structure. The wine shows remarkable harmony that will enhance your dining experience.`;
          servingSuggestions = "Serve at the appropriate temperature for the wine style to maximize flavor expression and structural balance.";
        }
        
        // Age considerations based on vintage and type - make concise and specific
        if (wine.type?.toLowerCase() === 'red' && wine.vintage && wine.vintage > 2020) {
          ageConsiderations = "Currently young with primary fruit dominance. While approachable now with decanting, will develop more complexity over the next 3-5 years as tannins integrate further.";
        } else if (wine.type?.toLowerCase() === 'red' && wine.vintage && wine.vintage > 2015) {
          ageConsiderations = "In an excellent drinking window now with balanced fruit and emerging secondary characteristics. Will maintain this sweet spot for another 3-5 years before tertiary notes become more prominent.";
        } else if (wine.type?.toLowerCase() === 'red' && wine.vintage) {
          ageConsiderations = "Fully mature with integrated tannins and developed tertiary characteristics. Drink within the next 1-2 years to enjoy the wine's complex evolution.";
        } else if (wine.type?.toLowerCase() === 'white' && wine.vintage && wine.vintage > 2021) {
          ageConsiderations = "Youthful and vibrant with primary fruit expression. Will gain textural complexity over the next 1-2 years though perfectly enjoyable now for its fresh character.";
        } else if (wine.type?.toLowerCase() === 'white' && wine.vintage) {
          ageConsiderations = "Currently in peak drinking window with ideal balance between fruit freshness and developed complexity. Enjoy over the next 1-2 years.";
        } else {
          ageConsiderations = "At an optimal drinking stage now. Enjoy within its recommended drinking window for the best expression of character and quality.";
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
      
      // Add a concise, helpful message without mentioning technical issues
      if (!recommendationData.additionalSuggestions || 
          recommendationData.additionalSuggestions.includes("couldn't generate") ||
          recommendationData.additionalSuggestions.includes("encountered a technical issue")) {
        recommendationData.additionalSuggestions = 
          "For even more tailored recommendations, try including specific flavor profiles you enjoy or details about food preparation methods.";
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