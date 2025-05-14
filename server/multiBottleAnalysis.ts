import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './anthropic';
import { cleanGrapeVarieties, cleanLocation } from '@shared/wineUtils';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Interface for wine analysis results
 */
export interface WineAnalysisResult {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  grapeVarieties: string | null;
  type: string | null;
  alcoholContent: number | null;
  confidence: number;
  recommendedDrinkingWindow?: {
    startYear: number;
    endYear: number;
    notes: string;
    isPastPrime: boolean;
  };
  isReadable: boolean;
  bottlePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Detect and analyze multiple wine bottles in an image
 */
export async function detectWineBottles(imageBase64: string): Promise<{
  success: boolean;
  data?: { bottles: WineAnalysisResult[] };
  error?: string;
}> {
  try {
    console.log('Detecting and analyzing multiple wine bottles in image...');
    
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a wine expert with exceptional visual recognition abilities. Analyze this image and identify any wine bottles present.

First, determine how many wine bottles with visible labels are in the image. For each visible bottle:
1. Focus on that specific bottle only
2. Extract as much information as possible from its label
3. If a bottle's label is not clearly visible or readable, mark it as unreadable and continue to the next one

For each bottle with a readable label, extract the following information:
- Producer name
- Wine name
- Vintage
- Region
- Subregion
- Country
- Grape varieties
- Wine type (Red, White, Rosé, Sparkling, Dessert, Fortified, Other)
- Alcohol content
- Estimated position in the image (approximate coordinates)

Return your findings in the following JSON format:
{
  "bottleCount": number,
  "bottles": [
    {
      "producer": string or null,
      "name": string or null,
      "vintage": number or null,
      "region": string or null,
      "subregion": string or null,
      "country": string or null,
      "grapeVarieties": string or null,
      "type": string or null,
      "alcoholContent": number or null,
      "confidence": number (0-1 indicating your confidence in the analysis),
      "isReadable": boolean,
      "bottlePosition": {
        "x": number,
        "y": number,
        "width": number,
        "height": number
      },
      "notes": string (any additional observations about this specific bottle)
    },
    // Additional bottles...
  ]
}

If no wine bottles are detected in the image, return: { "bottleCount": 0, "bottles": [] }`
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
      ]
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
    const analysisData = JSON.parse(jsonMatch[0]);
    
    // Clean and process each bottle's data
    if (analysisData.bottles && Array.isArray(analysisData.bottles)) {
      analysisData.bottles = analysisData.bottles.map((bottle: any) => {
        // Clean grape varieties and location data
        if (bottle.grapeVarieties) {
          bottle.grapeVarieties = cleanGrapeVarieties(bottle.grapeVarieties);
        }
        
        if (bottle.region) {
          bottle.region = cleanLocation(bottle.region);
        }
        
        if (bottle.subregion) {
          bottle.subregion = cleanLocation(bottle.subregion);
        }
        
        // Ensure the confidence score is between 0 and 1
        if (typeof bottle.confidence === 'number') {
          bottle.confidence = Math.max(0, Math.min(1, bottle.confidence));
        } else {
          bottle.confidence = 0.5; // Default
        }
        
        return bottle;
      });
    }
    
    return {
      success: true,
      data: {
        bottles: analysisData.bottles || []
      }
    };
  } catch (error) {
    console.error('Error detecting wine bottles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Handle multi-bottle image upload and analysis
 */
export async function handleMultiBottleAnalysis(req: Request, res: Response) {
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

    console.log('Starting multi-bottle wine label analysis...');
    
    // Analyze the image for multiple wine bottles
    const analysisResult = await detectWineBottles(base64Data);
    
    console.log('Multi-bottle analysis result:', 
      analysisResult.success ? 'Success' : 'Failed', 
      analysisResult.success ? `Found ${analysisResult.data?.bottles.length} bottles` : analysisResult.error
    );

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: analysisResult.error || 'Failed to analyze wine bottles'
      });
    }

    // Return the analyzed bottles data
    return res.status(200).json({
      success: true,
      data: analysisResult.data
    });
  } catch (error) {
    console.error('Error in multi-bottle analysis handler:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
}