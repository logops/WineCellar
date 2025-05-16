import { Wine } from '@shared/schema';
import { anthropic } from './anthropic';
import { Request, Response } from 'express';
import { storage } from './storage';

/**
 * Handles analyzing a wine label image and matching it to wines in the user's cellar
 */
export async function handleLabelMatchingRoute(req: Request, res: Response) {
  try {
    // Check if we have an image file
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Check user authentication
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get image data
    const imageBase64 = req.file.buffer.toString('base64');
    
    // Get user's wines
    const userWines = await storage.getWinesByUserId(req.user.id);
    
    // Only include wines that are still in the cellar (quantity > 0)
    const activeWines = userWines.filter(wine => (wine.quantity ?? 0) > 0);
    
    if (activeWines.length === 0) {
      return res.status(200).json({ 
        success: true, 
        matchedWines: [],
        message: 'No wines in your cellar to match against'
      });
    }
    
    // Format the wine list for the AI
    const wineList = activeWines.map(wine => ({
      id: wine.id,
      producer: wine.producer || "Unknown producer",
      name: wine.name || "",
      vintage: wine.vintage || "Unknown vintage",
      type: wine.type || "",
      region: wine.region || "",
      grapeVarieties: wine.grapeVarieties || ""
    }));

    // Send image to Claude for analysis and matching
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        system: `You are a wine expert assistant specialized in matching wine labels to a cellar inventory.
                From the wine label image, extract information and match it against the user's wine collection.
                
                Instructions:
                1. Analyze the wine label image to identify producer, vintage, name, grape varieties, and region
                2. Find wines in the provided cellar inventory that match the label image
                3. Focus on matching producer name (highest priority), then vintage, then wine name
                4. Return only wines that are actually in the user's cellar (by ID)
                
                Format your response as JSON with these properties:
                - labelInfo: information extracted from the image (producer, vintage, name, etc.)
                - matchedWineIds: array of wine IDs from the cellar that match the label, ordered by confidence
                - matchReasons: object with wine IDs as keys and reasons for matching as values`,
        messages: [
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: `I need to find this wine in my cellar. Look at this wine label and tell me which of my wines it matches.
                
                Here's my cellar inventory:
                ${JSON.stringify(wineList, null, 2)}
                
                Format response as JSON with:
                - labelInfo: details you can read from the label
                - matchedWineIds: array of wine IDs from my cellar that match this label
                - matchReasons: object with wine IDs as keys and match reasons as values`
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

      // Extract the text response
      const responseContent = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      // Parse the JSON response
      let matchResult;
      try {
        // Look for JSON pattern in the response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          matchResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract valid JSON from response');
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }
      
      // Use the matched wine IDs to get the actual wine objects
      const matchedWines = [];
      if (matchResult.matchedWineIds && Array.isArray(matchResult.matchedWineIds)) {
        for (const wineId of matchResult.matchedWineIds) {
          const wine = activeWines.find(w => w.id === wineId);
          if (wine) {
            // Add match reason to wine object
            matchedWines.push({
              ...wine,
              matchReason: matchResult.matchReasons?.[wineId] || 'Matched by AI'
            });
          }
        }
      }
      
      // Log results for debugging
      console.log('Label info:', matchResult.labelInfo);
      console.log('Matched wine IDs:', matchResult.matchedWineIds);
      console.log('Number of matches found:', matchedWines.length);
      
      return res.status(200).json({
        success: true,
        labelInfo: matchResult.labelInfo,
        matchedWines
      });
      
    } catch (aiError) {
      console.error('Error using AI for label matching:', aiError);
      return res.status(500).json({ error: 'Failed to analyze wine label' });
    }
  } catch (error) {
    console.error('Error in label matching route:', error);
    return res.status(500).json({ 
      error: 'Failed to process wine label',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}