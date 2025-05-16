import { Request, Response } from 'express';
import { analyzeWineLabel } from './anthropic';
import { storage } from './storage';
import { Wine } from '@shared/schema';
import { anthropic } from './anthropic';

/**
 * Use Claude AI to match detected wine label against
 * wines in the user's cellar using advanced comparison
 */
export async function matchWineFromLabel(
  labelInfo: any,
  userWines: Wine[]
): Promise<Wine[]> {
  if (!labelInfo || !userWines || userWines.length === 0) {
    return [];
  }

  try {
    // If we have enough wines to make it worthwhile, use AI to help with matching
    if (userWines.length > 5) {
      // Format user wines for Claude's analysis
      const wineList = userWines
        .filter(wine => (wine.quantity ?? 0) > 0)
        .map(wine => ({
          id: wine.id,
          producer: wine.producer || "Unknown",
          name: wine.name || "",
          vintage: wine.vintage || "Unknown",
          grapeVarieties: wine.grapeVarieties || "",
          region: wine.region || "",
          quantity: wine.quantity || 0
        }));
      
      // Extract information from the label analysis
      const {
        producer,
        name,
        vintage,
        grapeVarieties,
        region,
        subregion,
        country
      } = labelInfo;
      
      // Use Claude to find the best matches
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        system: `You are a wine expert helping to match a wine label against a cellar inventory. 
                Find the most likely matches and return your results as a JSON array of objects with properties:
                - wineId: the ID of the matched wine
                - score: a number from 0-100 representing match confidence
                - reason: a brief explanation of why this is a match
                
                Focus on producer name as the most important factor, then vintage, then wine name.
                Return only JSON with no other text.`,
        messages: [
          { 
            role: "user", 
            content: `I need to match this wine label information:
            
            Producer: ${producer || "Not visible"}
            Name: ${name || "Not visible"}
            Vintage: ${vintage || "Not visible"}
            Grape Varieties: ${grapeVarieties || "Not visible"}
            Region: ${region || "Not visible"}
            Subregion: ${subregion || "Not visible"}
            Country: ${country || "Not visible"}
            
            Against these wines in my cellar:
            ${JSON.stringify(wineList, null, 2)}
            
            Return the best matches in JSON format. Return only wines with a confidence score above 50.
            If no good matches exist, return an empty array.`
          }
        ]
      });
      
      let aiMatches: { wineId: number; score: number; reason: string }[] = [];
      try {
        // Parse AI's response
        const responseText = response.content[0].text;
        
        // Handle potential non-JSON responses gracefully
        if (responseText.includes("[") && responseText.includes("]")) {
          const jsonContent = responseText.substring(
            responseText.indexOf("["),
            responseText.lastIndexOf("]") + 1
          );
          aiMatches = JSON.parse(jsonContent);
          
          console.log("AI matches:", JSON.stringify(aiMatches, null, 2));
          
          // Return wines based on AI matches
          if (aiMatches && aiMatches.length > 0) {
            const matchedWines = aiMatches.map(match => {
              const wine = userWines.find(w => w.id === match.wineId);
              if (wine) {
                // Add the AI's reasoning to the wine object for display
                return {
                  ...wine, 
                  matchReason: match.reason,
                  matchScore: match.score
                };
              }
              return null;
            }).filter(Boolean) as Wine[];
            
            return matchedWines;
          }
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        // Fall back to regular matching
      }
    }
    
    // Extract information from the label analysis if AI matching failed
    const {
      producer,
      name,
      vintage,
      grapeVarieties,
      region,
      subregion,
      country
    } = labelInfo;

  // Filter active wines only (ones with quantity > 0)
  const activeWines = userWines.filter(wine => (wine.quantity ?? 0) > 0);
  
  // Calculate match scores for each wine in the cellar
  const matches = activeWines.map(wine => {
    let score = 0;
    const maxScore = 100;
    let matchDetails = [];
    
    // Producer is the most important matching factor (up to 40 points)
    if (producer && wine.producer) {
      const producerMatch = compareStrings(producer, wine.producer);
      score += producerMatch * 40;
      if (producerMatch > 0.5) {
        matchDetails.push(`Producer match: ${Math.round(producerMatch * 100)}%`);
      }
    }
    
    // Vintage is also very important (up to 25 points)
    if (vintage && wine.vintage) {
      // Allow slightly fuzzy matching for vintage (±1 year)
      if (vintage === wine.vintage) {
        score += 25;
        matchDetails.push('Exact vintage match');
      } else if (Math.abs(Number(vintage) - Number(wine.vintage)) <= 1) {
        score += 15;
        matchDetails.push('Close vintage match');
      }
    }
    
    // Wine name is important (up to 20 points)
    if (name && wine.name) {
      const nameMatch = compareStrings(name, wine.name);
      score += nameMatch * 20;
      if (nameMatch > 0.5) {
        matchDetails.push(`Name match: ${Math.round(nameMatch * 100)}%`);
      }
    }
    
    // Region matching (up to 10 points)
    if (region && wine.region) {
      const regionMatch = compareStrings(region, wine.region);
      score += regionMatch * 10;
      if (regionMatch > 0.7) {
        matchDetails.push(`Region match: ${Math.round(regionMatch * 100)}%`);
      }
    }
    
    // Grape varieties (up to 5 points)
    if (grapeVarieties && wine.grapeVarieties) {
      const grapeMatch = compareStrings(grapeVarieties, wine.grapeVarieties);
      score += grapeMatch * 5;
      if (grapeMatch > 0.7) {
        matchDetails.push(`Grape match: ${Math.round(grapeMatch * 100)}%`);
      }
    }
    
    // Exact producer name gets a significant boost
    if (producer && wine.producer && 
        (producer.toLowerCase() === wine.producer.toLowerCase() || 
         wine.producer.toLowerCase().startsWith(producer.toLowerCase()))) {
      score += 30;
      matchDetails.push('Strong producer match');
    }
    
    // Log matching details for debugging
    console.log(`Matching "${producer || ''} ${name || ''}" against "${wine.producer || ''} ${wine.name || ''}": Score ${score}`);
    
    return {
      wine,
      score: Math.min(score, maxScore),
      matchDetails
    };
  });
  
  // Sort by score (highest first) and filter wines with a score above the threshold
  const threshold = 40; // Minimum 40% confidence to consider a match
  const sortedMatches = matches
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
  
  // Return the matched wines, up to 5 results
  return sortedMatches.slice(0, 5).map(match => match.wine);
}

/**
 * Simple string similarity comparison (returns a value from 0 to 1)
 */
function compareStrings(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  // Check for partial word matches
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matchCount = 0;
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip short words
    for (const word2 of words2) {
      if (word2.length < 3) continue;
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchCount++;
        break;
      }
    }
  }
  
  const matchRatio = matchCount / Math.max(words1.length, words2.length);
  return matchRatio;
}

/**
 * Handle wine label analysis for removal
 */
export async function handleWineLabelForRemoval(req: Request, res: Response) {
  if (!req.file && !req.files) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    // Get the image from the request (multer makes it available as req.file)
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert the image to base64
    const imageBase64 = imageFile.buffer.toString('base64');

    // First, use our existing wine label analysis to extract information
    const labelAnalysis = await analyzeWineLabel(imageBase64);
    
    // Then fetch all wines for the current user
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userWines = await storage.getWinesByUserId(req.user.id);
    
    // Match the analyzed wine against the user's cellar
    const matchedWines = await matchWineFromLabel(labelAnalysis, userWines);
    
    return res.status(200).json({
      success: true,
      labelAnalysis,
      matchedWines
    });
  } catch (error) {
    console.error('Error in wine label removal analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to analyze wine label',
      details: errorMessage
    });
  }
}