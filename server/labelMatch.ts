import { Request, Response } from 'express';
import { storage } from './storage';
import { Wine } from '@shared/schema';
import { anthropic } from './anthropic';

/**
 * Match wine labels against the user's collection
 */
export async function matchWineLabel(req: Request, res: Response) {
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
    
    // Use Anthropic to analyze the label
    try {
      const labelAnalysis = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        max_tokens: 2000,
        system: `You are a wine label analysis assistant helping wine enthusiasts identify wines in their collection.
          
        Given a wine label image, your task is to:
        1. Extract key information like producer, name, vintage, region, and grape varieties
        2. Match this information against their existing collection
        3. Return only wines that are highly likely to be the same wine
        
        Focus on accurate matching based on the most important identifiers: producer, vintage, and name.`,
        messages: [
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: `Analyze this wine label and help me identify which wines in my collection it matches. 
                
                Here's information about all active wines in my collection:
                ${JSON.stringify(activeWines.map(wine => ({
                  id: wine.id,
                  producer: wine.producer,
                  name: wine.name,
                  vintage: wine.vintage,
                  region: wine.region,
                  grapeVarieties: wine.grapeVarieties
                })))}
                
                Return ONLY the IDs of wines that are likely matches in an array format, sorted by match confidence.
                
                Format your response as JSON: 
                { 
                  "labelInfo": { basic information extracted from the label }, 
                  "matchedWineIds": [array of matched wine IDs]
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
      
      // Extract and parse the AI response
      const responseText = labelAnalysis.content[0].text;
      
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not extract JSON from AI response");
        return res.status(500).json({ error: 'Failed to analyze wine label' });
      }
      
      try {
        const result = JSON.parse(jsonMatch[0]);
        console.log("AI Label Analysis:", JSON.stringify(result.labelInfo, null, 2));
        console.log("AI Matched Wine IDs:", result.matchedWineIds);
        
        // If we have matches, return the matching wines from the user's cellar
        let matchedWines: Wine[] = [];
        
        if (result.matchedWineIds && Array.isArray(result.matchedWineIds) && result.matchedWineIds.length > 0) {
          matchedWines = result.matchedWineIds
            .map(id => activeWines.find(wine => wine.id === id))
            .filter(Boolean) as Wine[];
        }
        
        return res.status(200).json({
          success: true,
          matchedWines,
          labelInfo: result.labelInfo
        });
        
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }
      
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

/**
 * Remove multiple wines from the collection
 */
export async function removeMultipleWines(req: Request, res: Response) {
  try {
    const { wineIds, notes } = req.body;
    
    if (!wineIds || !Array.isArray(wineIds) || wineIds.length === 0) {
      return res.status(400).json({ error: 'Wine IDs array is required' });
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const results = [];
    const now = new Date();
    
    // Process each wine
    for (const id of wineIds) {
      // Get the wine to ensure it exists
      const wine = await storage.getWine(id);
      
      if (!wine) {
        results.push({
          id,
          success: false,
          message: 'Wine not found'
        });
        continue;
      }
      
      // Remove the wine
      await storage.removeWine(id);
      
      // Record the result
      results.push({
        id,
        success: true,
        message: 'Wine removed successfully'
      });
    }
    
    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error removing multiple wines:', error);
    return res.status(500).json({ 
      error: 'Failed to remove wines',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}