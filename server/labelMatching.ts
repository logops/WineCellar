import { Request, Response } from 'express';
import { anthropic } from './anthropic';
import { storage } from './storage';
import { Wine } from '@shared/schema';

/**
 * Handles wine label matching for removal
 */
export async function analyzeWineLabelForRemoval(req: Request, res: Response) {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Convert image to base64 for Claude
    const imageBase64 = req.file.buffer.toString('base64');

    // Get user's wines
    const userWines = await storage.getWinesByUserId(req.user.id);
    
    // Filter to only include wines that are in the cellar
    const activeWines = userWines.filter(wine => (wine.quantity || 0) > 0);
    
    if (activeWines.length === 0) {
      return res.json({
        success: true,
        matchedWines: [],
        message: 'No wines in your cellar to match against'
      });
    }
    
    // Format data for Claude
    const wineList = activeWines.map(wine => ({
      id: wine.id,
      producer: wine.producer || '',
      name: wine.name || '',
      vintage: wine.vintage || '',
      type: wine.type || '',
      region: wine.region || '',
      subregion: wine.subregion || '',
      grapeVarieties: wine.grapeVarieties || '',
    }));

    // Use Claude to analyze the wine label and match against cellar
    try {
      const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        system: `You are a wine expert assistant that identifies wines from labels and matches them with a user's cellar inventory.
                
                INSTRUCTIONS:
                1. Analyze the wine label image to identify key information (producer, name, vintage, etc.)
                2. Match the wine in the image to wines in the user's cellar
                3. Return only wines that are actually in the user's cellar inventory
                4. Focus on matching producer name first, then vintage, then name/type
                
                IMPORTANT:
                - DO NOT invent wines that aren't in the provided cellar inventory
                - Only return IDs of wines that actually exist in the user's cellar
                - If no exact match is found but there are similar wines from the same producer, include those
                - If no match is found at all, return an empty array`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `I've taken a photo of a wine label. Please identify which wines in my cellar match this label.
                
                My wine cellar inventory:
                ${JSON.stringify(wineList, null, 2)}
                
                Return your response in this JSON format:
                {
                  "labelInfo": {
                    // Information you can read from the label
                    "producer": "Producer name",
                    "name": "Wine name",
                    "vintage": "Year",
                    "region": "Region",
                    "grapeVarieties": "Grape varieties"
                  },
                  "matchedWineIds": [
                    // Array of wine IDs from my cellar that match this label
                  ]
                }`
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }
        ]
      });

      // Extract the response text
      let responseText = '';
      if (message.content && message.content.length > 0) {
        const firstContent = message.content[0];
        if (firstContent.type === 'text') {
          responseText = firstContent.text;
        }
      }
      
      // Extract JSON from the response
      let result;
      try {
        // Look for JSON pattern in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          return res.status(500).json({ error: 'Could not parse AI response' });
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }
      
      // Extract matched wine IDs
      const matchedWineIds = result.matchedWineIds || [];
      
      // Convert IDs to actual wine objects
      const matchedWines = matchedWineIds.map(id => 
        activeWines.find(wine => wine.id === id)
      ).filter(Boolean);
      
      // Add the label info to each matched wine
      const enrichedMatches = matchedWines.map(wine => ({
        ...wine,
        matchInfo: result.labelInfo
      }));
      
      return res.json({
        success: true,
        labelInfo: result.labelInfo,
        matchedWines: enrichedMatches
      });
      
    } catch (aiError) {
      console.error('AI error:', aiError);
      return res.status(500).json({ error: 'Failed to analyze wine label with AI' });
    }
  } catch (error) {
    console.error('Error in wine label analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to process wine label',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}