import { Request, Response } from 'express';
import { analyzeWineLabel } from './anthropic';
import { storage } from './storage';
import { Wine } from '@shared/schema';

/**
 * Match the detected wine information from a label photo against
 * wines in the user's cellar to facilitate removal
 */
export async function matchWineFromLabel(
  labelInfo: any,
  userWines: Wine[]
): Promise<Wine[]> {
  if (!labelInfo || !userWines || userWines.length === 0) {
    return [];
  }

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

  // Filter active wines only (ones with quantity > 0)
  const activeWines = userWines.filter(wine => (wine.quantity ?? 0) > 0);
  
  // Calculate match scores for each wine in the cellar
  const matches = activeWines.map(wine => {
    let score = 0;
    const maxScore = 100;
    
    // Producer is the most important matching factor (up to 40 points)
    if (producer && wine.producer) {
      const producerMatch = compareStrings(producer, wine.producer);
      score += producerMatch * 40;
    }
    
    // Vintage is also very important (up to 25 points)
    if (vintage && wine.vintage && vintage === wine.vintage) {
      score += 25;
    }
    
    // Wine name is important (up to 20 points)
    if (name && wine.name) {
      const nameMatch = compareStrings(name, wine.name);
      score += nameMatch * 20;
    }
    
    // Region matching (up to 10 points)
    if (region && wine.region) {
      const regionMatch = compareStrings(region, wine.region);
      score += regionMatch * 10;
    }
    
    // Grape varieties (up to 5 points)
    if (grapeVarieties && wine.grapeVarieties) {
      const grapeMatch = compareStrings(grapeVarieties, wine.grapeVarieties);
      score += grapeMatch * 5;
    }
    
    return {
      wine,
      score: Math.min(score, maxScore)
    };
  });
  
  // Sort by score (highest first) and filter wines with a score above the threshold
  const threshold = 50; // Minimum 50% confidence to consider a match
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