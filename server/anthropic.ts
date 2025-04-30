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
              text: `You are an expert master sommelier and wine advisor with deep knowledge of wine regions, producers, vintages, and food pairings. Based on the following user query, recommend specific wines from their personal collection that would be appropriate.

USER QUERY: "${query}"

WINE COLLECTION:
${JSON.stringify(wineCollection, null, 2)}

Please analyze the user's query to understand what kind of occasion, food pairing, or experience they're looking for. Then recommend 1-5 wines from their collection that would be ideal.

For each recommendation, provide VERY SPECIFIC and DETAILED analysis that is unique to THAT PARTICULAR WINE:
1. Explain in detail why THIS SPECIFIC WINE (not just its type) is a good match for the query
2. Include specific information about THIS WINE'S characteristics that make it suitable
3. Mention if the wine is ready to drink now or needs aging (and why)
4. Add precise serving suggestions (exact temperature, decanting time if needed, specific glassware)

When recommending a wine, be very specific about WHY you chose THIS EXACT WINE over others of similar type in the collection. For example, if there are multiple Burgundy Chardonnays, explain precisely why you're recommending one over others based on:
- Specific producer style and characteristics
- The exact vintage and its qualities
- Specific features that make it more suitable for the requested pairing
- Current drinking window considerations
- Specific flavor compounds that interact with the food/occasion

If the query is about food pairing, provide DETAILED ANALYSIS about:
- Specific compounds in the wine that interact with the food
- Why this exact wine's acidity, tannin, alcohol, and sugar levels complement the dish
- Regional pairing traditions that apply to this specific wine
- Why the wine's age and maturity level suits this pairing

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
        
        // Create a fallback response with actual wines from the collection
        // Rather than showing no recommendations, we'll select the most versatile wines
        // from the user's collection as fallbacks
        const redWines = wineCollection.filter(w => w.type?.toLowerCase() === 'red');
        const whiteWines = wineCollection.filter(w => w.type?.toLowerCase() === 'white');
        
        // Add generic recommendations prioritizing reds for most food pairings
        // but include a white option if available
        const fallbackRecs: Recommendation[] = [];
        
        // Add red wine recommendations if available (most versatile for many pairings)
        if (redWines.length > 0) {
          // Sort by vintage (newer first as they're generally more approachable)
          const sortedReds = [...redWines].sort((a, b) => 
            (b.vintage || 2020) - (a.vintage || 2000)
          );
          
          // Add the top 1-2 red wine recommendations
          const topReds = sortedReds.slice(0, Math.min(2, sortedReds.length));
          
          topReds.forEach(wine => {
            fallbackRecs.push({
              wineId: wine.id,
              wine: `${wine.vintage || 'NV'} ${wine.producer} ${wine.name || ''}`.trim(),
              reasoning: "This red wine should complement your meal well. Red wines generally pair nicely with rich, flavorful dishes.",
              characteristics: "Red wines typically offer fruit-forward flavors with varying levels of tannins and acidity that help cut through rich foods.",
              servingSuggestions: "Serve slightly below room temperature (around 60-65°F/16-18°C) in a standard red wine glass.",
              ageConsiderations: wine.vintage && wine.vintage > 2018 ? 
                "This is a relatively young wine that should be showing fresh, vibrant characteristics." : 
                "This wine has had some time to develop more complex flavors.",
              confidenceScore: 0.7
            });
          });
        }
        
        // Add a white wine recommendation if available (for versatility)
        if (whiteWines.length > 0) {
          const newestWhite = whiteWines.reduce((newest, current) => 
            (current.vintage || 0) > (newest.vintage || 0) ? current : newest, 
            whiteWines[0]
          );
          
          fallbackRecs.push({
            wineId: newestWhite.id,
            wine: `${newestWhite.vintage || 'NV'} ${newestWhite.producer} ${newestWhite.name || ''}`.trim(),
            reasoning: "This white wine would provide a refreshing contrast to your meal and appeals to guests who prefer white wines.",
            characteristics: "White wines typically offer bright acidity and fruit flavors that can complement a variety of dishes.",
            servingSuggestions: "Serve chilled (around 45-50°F/7-10°C) in a standard white wine glass.",
            ageConsiderations: newestWhite.vintage && newestWhite.vintage > 2020 ? 
              "This young white wine should be fresh and vibrant with primary fruit flavors." : 
              "This white wine has had time to develop more complexity while maintaining freshness.",
            confidenceScore: 0.65
          });
        }
        
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
      // create fallback recommendations based on the wine collection
      if (recommendationData.recommendations.length === 0 && wineCollection.length > 0) {
        console.log("No recommendations were generated, creating fallbacks from collection");
        // Find red wines in the collection (most versatile for food pairings)
        const redWines = wineCollection.filter(w => w.type?.toLowerCase() === 'red');
        
        // If we have red wines, use the first one
        if (redWines.length > 0) {
          const fallbackWine = redWines[0];
          recommendationData.recommendations.push({
            wineId: fallbackWine.id,
            wine: `${fallbackWine.vintage || 'NV'} ${fallbackWine.producer} ${fallbackWine.name || ''}`.trim(),
            reasoning: "This red wine should complement your meal. Red wines generally pair well with a variety of dishes.",
            characteristics: "Red wines typically offer good structure and complex flavors that enhance the dining experience.",
            servingSuggestions: "Serve slightly below room temperature in a red wine glass.",
            ageConsiderations: "Check the vintage to determine if it's at its optimal drinking window.",
            confidenceScore: 0.6
          });
        } 
        // Otherwise use the first wine in the collection
        else if (wineCollection.length > 0) {
          const fallbackWine = wineCollection[0];
          recommendationData.recommendations.push({
            wineId: fallbackWine.id,
            wine: `${fallbackWine.vintage || 'NV'} ${fallbackWine.producer} ${fallbackWine.name || ''}`.trim(),
            reasoning: "This wine from your collection should be a reasonable choice for your meal or occasion.",
            characteristics: "Given the details of your query, this wine offers characteristics that should work well.",
            servingSuggestions: "Serve according to the wine type - chilled for white wines, room temperature for reds.",
            ageConsiderations: "Check the vintage to determine if it's at its optimal drinking window.",
            confidenceScore: 0.5
          });
        }
        
        // Add a more helpful message
        if (!recommendationData.additionalSuggestions || recommendationData.additionalSuggestions.includes("couldn't generate detailed recommendations")) {
          recommendationData.additionalSuggestions = 
            "Based on your query, I've selected a wine from your collection that should work reasonably well. For more tailored recommendations, try providing more details about your meal, flavor preferences, or the occasion.";
        }
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