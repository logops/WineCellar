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
  
  // If we already have grape varieties specified, return those
  if (existingGrapes && existingGrapes.trim() !== '') {
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
    // Red varieties
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
    'Gamay',
    'Mourvèdre',
    'Mouvedre',
    'Carignan',
    'Cinsault',
    'Petite Sirah',
    'Dolcetto',
    'Corvina',
    'Primitivo',
    'Nero d\'Avola',
    'Carménère',
    'Touriga Nacional',
    'Aglianico',
    'Montepulciano',
    'Mencia',
    'Tannat',
    'Pinotage',
    'Graciano',
    'Monastrell',
    
    // White varieties
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
    'Grenache Blanc',
    'Vermentino',
    'Albariño',
    'Verdejo',
    'Grüner Veltliner',
    'Torrontés',
    'Arneis',
    'Marsanne',
    'Roussanne',
    'Trebbiano',
    'Verdicchio',
    'Viura',
    'Fiano',
    'Picpoul',
    'Colombard',
    'Cortese',
    'Garganega',
    'Müller-Thurgau',
    'Sylvaner',
    'Assyrtiko',
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
    // Vineyard at the beginning
    { pattern: /Vineyard\s+([\w\s'-]+)/i, group: 1 },
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
    // Look for specific patterns used in different regions
    { pattern: /([\w\s'-]+)\s+Domaine/i, group: 1 },
    { pattern: /([\w\s'-]+)\s+Vyd/i, group: 1 },  // Common abbreviation
    { pattern: /VYD\s+([\w\s'-]+)/i, group: 1 },  // Abbreviation at the beginning
    { pattern: /([\w\s'-]+)\s+Vigneto/i, group: 1 }, // Italian
    { pattern: /([\w\s'-]+)\s+Vinas?/i, group: 1 }, // Spanish
    { pattern: /([\w\s'-]+)\s+Weinberg/i, group: 1 }, // German
    { pattern: /([\w\s'-]+)\s+Mountain/i, group: 1 }, // Common in mountain vineyards
    { pattern: /([\w\s'-]+)\s+Hill/i, group: 1 }, // Common in hill vineyards
    { pattern: /([\w\s'-]+)\s+Valley/i, group: 1 }, // Valley vineyards
    { pattern: /([\w\s'-]+)\s+Block/i, group: 1 }, // Common in new world
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
