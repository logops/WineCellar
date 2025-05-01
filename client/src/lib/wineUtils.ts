/**
 * Utility functions for processing wine data
 */

/**
 * Extract grape varieties from a wine name if they're mentioned
 * @param wineName The name of the wine which might contain grape varieties
 * @param existingGrapes Any existing grape varieties to preserve
 */
export function extractGrapeVarieties(wineName: string, existingGrapes?: string | null): string | undefined {
  if (!wineName) return existingGrapes || undefined;
  
  // If we already have grape varieties specified, return those
  if (existingGrapes && existingGrapes.trim() !== '') {
    return existingGrapes;
  }
  
  // Common grape varieties to look for in wine names
  const commonGrapes = [
    'Cabernet Sauvignon',
    'Cabernet Franc',
    'Merlot',
    'Pinot Noir',
    'Syrah',
    'Shiraz', 
    'Grenache',
    'Tempranillo',
    'Sangiovese',
    'Nebbiolo',
    'Barbera',
    'Zinfandel',
    'Malbec',
    'Petit Verdot',
    'Chardonnay',
    'Sauvignon Blanc',
    'Riesling',
    'Pinot Gris',
    'Pinot Grigio',
    'Gewürztraminer',
    'Viognier',
    'Chenin Blanc',
    'Sémillon',
    'Muscat',
    'Gamay',
    'Mourvèdre',
    'Petite Sirah',
    'Carmenere',
    'Semillon',
    'Albarino',
    'Roussanne',
    'Marsanne',
    'Gruner Veltliner',
    'Vermentino',
    'Mencia',
    'Primitivo',
    'Corvina',
    'Aglianico',
    'Dolcetto',
    'Verdejo',
    'Verdicchio',
    'Godello',
    'Fiano',
    'Carignan',
    'Grenache Blanc',
    'Tannat'
  ];
  
  // Define common abbreviations or partial mentions
  const grapeAliases: Record<string, string> = {
    'Cabernet': 'Cabernet Sauvignon',
    'Sauv Blanc': 'Sauvignon Blanc',
    'Pinot G': 'Pinot Gris',
    'P. Grigio': 'Pinot Grigio',
    'P. Noir': 'Pinot Noir',
    'Gewurz': 'Gewürztraminer',
    'Mouvedre': 'Mourvèdre',
    'Mouvèdre': 'Mourvèdre',
    'Mourvedre': 'Mourvèdre',
    'P. Sirah': 'Petite Sirah'
  };
  
  // Find aliases first
  for (const [alias, fullName] of Object.entries(grapeAliases)) {
    // Make sure we don't get false positives (e.g., "Cabernet" should not match if "Cabernet Franc" is in the name)
    const lowerName = wineName.toLowerCase();
    const lowerAlias = alias.toLowerCase();
    const lowerFull = fullName.toLowerCase();
    
    if (lowerName.includes(lowerAlias) && !lowerName.includes(lowerFull)) {
      // For Cabernet, make sure it's not Cabernet Franc
      if (alias === 'Cabernet' && lowerName.includes('cabernet franc')) {
        continue;
      }
      return fullName;
    }
  }
  
  // Find all exact matches
  const foundGrapes = commonGrapes.filter(grape => 
    wineName.toLowerCase().includes(grape.toLowerCase())
  );
  
  // If no exact matches, try to find word boundaries to catch standalone grape mentions
  if (foundGrapes.length === 0) {
    const words = wineName.split(/\s+/);
    for (const word of words) {
      // Clean up the word (remove punctuation)
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
      
      // Check against the entire grape list (exact match only)
      for (const grape of commonGrapes) {
        if (cleanWord.toLowerCase() === grape.toLowerCase()) {
          return grape;
        }
      }
    }
  }
  
  if (foundGrapes.length > 0) {
    return foundGrapes.join(', ');
  }
  
  return undefined;
}

/**
 * Extract vineyard information from a wine name
 * @param wineName The wine name that might contain vineyard details
 * @param existingVineyard Any existing vineyard information to preserve
 */
export function extractVineyard(wineName: string, existingVineyard?: string | null): string | undefined {
  if (!wineName) return existingVineyard || undefined;
  
  // If we already have vineyard specified, return that
  if (existingVineyard && existingVineyard.trim() !== '') {
    return existingVineyard;
  }
  
  // Common patterns for vineyard mentions in wine names
  const vineyardPatterns = [
    // Look for "Vineyard" mentions
    { pattern: /([\w\s'-]+)\s+Vineyard/i, group: 1 },
    // Look for estates
    { pattern: /([\w\s'-]+)\s+Estate/i, group: 1 },
    // Look for "Cru" mentions (common in French wines)
    { pattern: /([\w\s'-]+)\s+Cru/i, group: 1 },
    // Look for "Clos" mentions (common in Burgundy)
    { pattern: /Clos\s+([\w\s'-]+)/i, group: 1 },
    // Look for "Grand Cru" or "Premier Cru" mentions
    { pattern: /(Grand Cru|Premier Cru|1er Cru)\s+([\w\s'-]+)/i, group: 2 },
    // Look for "Single Vineyard" mentions
    { pattern: /Single Vineyard\s+([\w\s'-]+)/i, group: 1 },
    // Look for "Heart of the X" pattern (common in some regions)
    { pattern: /Heart of the\s+([\w\s'-]+)/i, group: 1 },
    // Look for "X Vineyard" pattern
    { pattern: /([\w\s'-]+)\s+Vyd\.?/i, group: 1 },
    // Look for "Vigneto" (Italian for vineyard)
    { pattern: /Vigneto\s+([\w\s'-]+)/i, group: 1 },
    // Look for "Vigna" (Italian for vineyard)
    { pattern: /Vigna\s+([\w\s'-]+)/i, group: 1 },
    // Look for common vineyard suffixes
    { pattern: /([\w\s'-]+)\s+(Block|Parcel|Plot|Lot|Section)/i, group: 1 },
    // Look for names between quotes that might be vineyard names
    { pattern: /"([\w\s'-]+)"/i, group: 1 },
  ];
  
  // Try each pattern
  for (const { pattern, group } of vineyardPatterns) {
    const match = wineName.match(pattern);
    if (match && match[group]) {
      return match[group].trim();
    }
  }
  
  return undefined;
}

/**
 * Process a wine name to extract grape varieties and vineyard information
 * @param wine Wine object containing name and potentially grape/vineyard info
 * @returns Updated wine object with extracted information
 */
export function processWineTitle<T extends { name?: string | null; grapeVarieties?: string | null; vineyard?: string | null }>(
  wine: T
): T {
  if (!wine.name) return wine;
  
  const extractedGrapes = extractGrapeVarieties(wine.name, wine.grapeVarieties);
  const extractedVineyard = extractVineyard(wine.name, wine.vineyard);
  
  return {
    ...wine,
    grapeVarieties: extractedGrapes || wine.grapeVarieties || null,
    vineyard: extractedVineyard || wine.vineyard || null
  };
}

/**
 * Interface for the response from the AI lookup wine information API
 */
export interface WineInfoLookupResponse {
  success: boolean;
  data?: {
    grapeVarieties: string;
    vineyard: string;
    confidenceLevel: 'high' | 'medium' | 'low';
    reasoning: string;
  };
  message?: string;
}

/**
 * Look up wine information using the AI
 * @param wineName The wine name to look up
 * @param producer The producer name (if available)
 * @param vintage The wine vintage (if available)
 * @returns Promise with grape varieties and vineyard information
 */
export async function lookupWineInformation(
  wineName: string,
  producer?: string,
  vintage?: number | string
): Promise<WineInfoLookupResponse> {
  try {
    const response = await fetch('/api/wine-info-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wineName,
        producer,
        vintage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to look up wine information',
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error looking up wine information:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred while looking up wine information',
    };
  }
}
