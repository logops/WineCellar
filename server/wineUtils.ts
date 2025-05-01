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
    'Mouvedre',
    'Carignan',
    'Cinsault',
    'Petite Sirah',
    'Grenache Blanc',
    'Marsanne',
    'Roussanne',
    'Vermentino',
    'Albariño',
    'Verdejo',
    'Touriga Nacional',
    'Primitivo',
    'Grüner Veltliner',
    'Corvina',
    'Garganega',
    'Trebbiano',
    'Nero d\'Avola',
    'Aglianico',
    'Glera',
    'Carménère'
  ];
  
  // Find all matches
  const foundGrapes = commonGrapes.filter(grape => 
    wineName.toLowerCase().includes(grape.toLowerCase())
  );
  
  // If no grape found with simple matching, try more advanced patterns
  if (foundGrapes.length === 0) {
    // Check if the last word of the wine name is a grape variety
    // This catches formats like "Heart of the Hill Vineyard Mouvedre"
    const nameWords = wineName.split(/\s+/);
    const lastWord = nameWords[nameWords.length - 1];
    
    const matchingGrape = commonGrapes.find(grape => 
      lastWord.toLowerCase() === grape.toLowerCase() ||
      grape.toLowerCase().includes(lastWord.toLowerCase())
    );
    
    if (matchingGrape) {
      foundGrapes.push(matchingGrape);
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
