/**
 * Utility functions for processing wine data
 */

// Producer to grape variety mappings for well-known producers
const PRODUCER_GRAPE_MAPPINGS: Record<string, string> = {
  // Napa producers
  'Robert Mondavi': 'Cabernet Sauvignon, Chardonnay',
  'Opus One': 'Cabernet Sauvignon, Cabernet Franc, Merlot, Petit Verdot, Malbec',
  'Silver Oak': 'Cabernet Sauvignon',
  'Caymus': 'Cabernet Sauvignon',
  'Stag\'s Leap': 'Cabernet Sauvignon',
  'Heitz Cellar': 'Cabernet Sauvignon',
  'Far Niente': 'Cabernet Sauvignon, Chardonnay',
  'Shafer': 'Cabernet Sauvignon, Syrah, Merlot',
  'Cakebread': 'Cabernet Sauvignon, Chardonnay, Sauvignon Blanc',
  'Duckhorn': 'Merlot, Cabernet Sauvignon',
  'ADAMVS': 'Cabernet Sauvignon',
  'Di Costanzo': 'Cabernet Sauvignon',
  'Corison': 'Cabernet Sauvignon',
  'Harlan Estate': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot',
  'Joseph Phelps': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot, Malbec, Syrah',
  'Dominus': 'Cabernet Sauvignon, Cabernet Franc, Petit Verdot',
  
  // Sonoma producers
  'Ridge': 'Zinfandel, Cabernet Sauvignon, Chardonnay, Petite Sirah',
  'Kosta Browne': 'Pinot Noir, Chardonnay',
  'Williams Selyem': 'Pinot Noir, Chardonnay',
  'Littorai': 'Pinot Noir, Chardonnay',
  'Hirsch': 'Pinot Noir, Chardonnay',
  'Ramey': 'Chardonnay, Syrah, Cabernet Sauvignon',
  'Martinelli': 'Pinot Noir, Chardonnay, Zinfandel, Syrah',
  'Rochioli': 'Pinot Noir, Chardonnay',
  'Peay': 'Pinot Noir, Syrah, Chardonnay',
  'DuMOL': 'Pinot Noir, Chardonnay, Syrah, Cabernet Sauvignon',
  'Hanzell': 'Pinot Noir, Chardonnay',
  'Kistler': 'Chardonnay, Pinot Noir',
  'Paul Hobbs': 'Pinot Noir, Chardonnay, Cabernet Sauvignon',
  
  // Italian producers
  'Gaja': 'Nebbiolo, Sangiovese, Cabernet Sauvignon, Merlot, Chardonnay',
  'Sassicaia': 'Cabernet Sauvignon, Cabernet Franc',
  'Antinori': 'Sangiovese, Cabernet Sauvignon, Merlot, Cabernet Franc',
  'Biondi Santi': 'Sangiovese',
  'Ornellaia': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot',
  'Giacomo Conterno': 'Nebbiolo',
  'Bruno Giacosa': 'Nebbiolo, Barbera',
  'Vietti': 'Nebbiolo, Barbera, Arneis',
  'Produttori del Barbaresco': 'Nebbiolo',
  'Tiberio': 'Montepulciano, Trebbiano',
  'Ar.Pe.Pe.': 'Nebbiolo',
  'Bertani': 'Corvina, Rondinella',
  
  // French producers
  'Chateau Margaux': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot',
  'Château Latour': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot',
  'Chateau Lafite Rothschild': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot',
  'Château Mouton Rothschild': 'Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot',
  'Romanée-Conti': 'Pinot Noir',
  'Domaine Leflaive': 'Chardonnay',
  'Guigal': 'Syrah, Grenache, Mourvèdre',
  'Château Cheval Blanc': 'Cabernet Franc, Merlot',
  'Château Petrus': 'Merlot',
  'Château d\'Yquem': 'Semillon, Sauvignon Blanc',
  'Krug': 'Pinot Noir, Chardonnay, Pinot Meunier',
  'Dom Pérignon': 'Pinot Noir, Chardonnay',
  'Louis Roederer': 'Pinot Noir, Chardonnay, Pinot Meunier',
  'Vega Sicilia': 'Tempranillo, Cabernet Sauvignon, Merlot',
  'Chateau Dufort Vivens': 'Cabernet Sauvignon, Merlot, Cabernet Franc'
};

/**
 * Extract grape varieties from a wine name if they're mentioned
 * @param wineName The name of the wine which might contain grape varieties
 * @param existingGrapes Any existing grape varieties to preserve
 * @param producer The producer name to look up grape varieties in the mapping
 */
export function extractGrapeVarieties(wineName: string, existingGrapes?: string | null, producer?: string | null): string | undefined {
  if (!wineName && !producer) return existingGrapes || undefined;
  
  // If we already have grape varieties specified, check if they conflict with the wine name
  if (existingGrapes && existingGrapes.trim() !== '') {
    // Special case: If wine name contains a specific varietal but existingGrapes has multiple varieties
    // This handles cases like "Cabernet Sauvignon" in the name but "Zinfandel, Cabernet Sauvignon, Chardonnay, Petite Sirah" in grapes
    const singleVarietalNames = [
      'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Sauvignon Blanc', 'Merlot', 'Zinfandel',
      'Syrah', 'Malbec', 'Grenache', 'Cabernet Franc', 'Petit Verdot', 'Viognier', 'Riesling'
    ];
    
    // Check if the wine name specifically mentions a single varietal
    const namedVarietal = singleVarietalNames.find(varietal => 
      wineName.toLowerCase().includes(varietal.toLowerCase())
    );
    
    // If the wine name contains a single varietal name, and existing grapes has multiple varieties
    if (namedVarietal && existingGrapes.includes(',')) {
      const grapeList = existingGrapes.split(',').map(g => g.trim());
      
      // If the named varietal is in the list, prioritize it as the primary grape
      if (grapeList.some(g => g.toLowerCase() === namedVarietal.toLowerCase())) {
        console.log(`Wine named after ${namedVarietal} but has multiple varieties (${existingGrapes}) - prioritizing ${namedVarietal}`);
        return namedVarietal;
      }
    }
    
    return existingGrapes;
  }
  
  // Check producer mappings first if producer is provided
  if (producer) {
    // Look for exact matches
    if (PRODUCER_GRAPE_MAPPINGS[producer]) {
      return PRODUCER_GRAPE_MAPPINGS[producer];
    }
    
    // Look for partial matches (e.g., "Robert Mondavi Winery" should match "Robert Mondavi")
    for (const knownProducer of Object.keys(PRODUCER_GRAPE_MAPPINGS)) {
      if (producer.includes(knownProducer) || knownProducer.includes(producer)) {
        return PRODUCER_GRAPE_MAPPINGS[knownProducer];
      }
    }
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
export function processWineTitle<T extends { name?: string | null; grapeVarieties?: string | null; vineyard?: string | null; producer?: string | null }>(
  wine: T
): T {
  if (!wine.name) return wine;
  
  // Pass the producer to improve grape variety detection
  const extractedGrapes = extractGrapeVarieties(wine.name, wine.grapeVarieties, wine.producer);
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

// Import the shared utilities
import { cleanGrapeVarieties, cleanLocation } from '@shared/wineUtils';

// Re-export them from this file so they can be used by other client components
export { cleanGrapeVarieties, cleanLocation };

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
