import { Wine } from '@shared/schema';
import { anthropic } from './anthropic';

/**
 * Uses Claude Vision to extract information from a wine label image
 * and match it against wines in the user's cellar
 */
export async function matchWineImageToCellar(imageBase64: string, userWines: Wine[]): Promise<Wine[]> {
  try {
    // Filter to only include wines that are still in the cellar
    const activeWines = userWines.filter(wine => (wine.quantity ?? 0) > 0);
    
    if (activeWines.length === 0) {
      return [];
    }
    
    // Format the wines as a concise list for Claude
    const cellarInventory = activeWines.map(wine => {
      return {
        id: wine.id,
        producer: wine.producer || "Unknown",
        name: wine.name || "",
        vintage: wine.vintage || null,
        type: wine.type || "",
        region: wine.region || "",
        grapeVarieties: wine.grapeVarieties || ""
      };
    });

    // Define detailed prompt for Claude to analyze image and match with cellar
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      system: `You are an expert wine sommelier assistant specialized in analyzing wine labels. 
              From the wine label image, extract as much information as possible about the wine.
              Then match this wine against a list of wines in the user's cellar, identifying which wines in the cellar are most likely to be the same as the one in the image.
              
              You should:
              1. Analyze the image to identify the producer, vintage, wine name, grape varieties, region, and any other distinctive information
              2. Consider all wines in the user's cellar, focusing especially on matching the producer name (highest priority), then vintage, then wine name/type
              3. Return only wines with a high confidence of being a match
              
              Return your response as an object with two properties:
              - labelInfo: containing what you extracted from the image (producer, name, vintage, etc.)
              - matches: an array of wine IDs from the cellar that match, ordered by confidence (highest first)`,
      messages: [
        { 
          role: "user", 
          content: [
            {
              type: "text",
              text: `I'm trying to identify this wine label from my collection to know which bottles to remove from my cellar inventory. Look at this wine label and tell me which of my wines in my cellar it matches.

Here is my cellar inventory:
${JSON.stringify(cellarInventory, null, 2)}

Return the matches as a JSON object with:
- labelInfo: what you can read from the label (producer, vintage, name, etc.)
- matches: array of wine IDs from my cellar that match this label, in order of confidence`
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
    const responseText = response.content[0].text;
    
    // Look for JSON structure in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from AI response");
      return [];
    }
    
    try {
      const result = JSON.parse(jsonMatch[0]);
      console.log("AI Label Analysis:", JSON.stringify(result.labelInfo, null, 2));
      console.log("AI Matched Wine IDs:", result.matches);
      
      // If we have matches, return the matching wines from the user's cellar
      if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
        return result.matches.map(id => {
          const matchedWine = activeWines.find(wine => wine.id === id);
          if (!matchedWine) return null;
          
          // Add match details to the wine object
          return {
            ...matchedWine,
            matchDetails: {
              labelInfo: result.labelInfo,
              isExactMatch: result.matches[0] === id // First match is highest confidence
            }
          };
        }).filter(Boolean) as Wine[];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }
    
    return [];
  } catch (error) {
    console.error("Error in wine image matching:", error);
    return [];
  }
}