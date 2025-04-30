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

Output your response in the following JSON format:
{
  "recommendations": [
    {
      "wineId": number,
      "wine": string, // A formatted string with vintage, producer and name
      "reasoning": string, // Detailed explanation of why this SPECIFIC wine works well
      "characteristics": string, // Detailed flavor/aroma profile specific to this wine
      "servingSuggestions": string, // Precise temperature, decanting, glassware
      "ageConsiderations": string, // If the wine is ready now or needs aging and why
      "confidenceScore": number // 0-1 indicating confidence in recommendation
    }
  ],
  "additionalSuggestions": string // Any additional expert advice if needed
}

If there are no suitable wines in the collection for this query, provide alternative suggestions or detailed expert advice in the additionalSuggestions field.`
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
    
    // Parse the extracted JSON
    const recommendationData = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: recommendationData
    };
  } catch (error) {
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