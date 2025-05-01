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

// Wine regions by country
const WINE_REGIONS = {
  // France
  'France': [
    'Alsace', 'Beaujolais', 'Bordeaux', 'Burgundy', 'Chablis', 'Champagne', 
    'Cognac', 'Languedoc-Roussillon', 'Loire', 'Provence', 'Rhone', 'Savoie/Jura',
    'Southwest France', 'Armagnac', 'Calvados'
  ],
  // Italy
  'Italy': [
    'Abruzzo', 'Campania', 'Emilia Romagna', 'Friuli-Venezia-Giulia', 'Lombardy',
    'Marche', 'Piedmont', 'Puglia', 'Sardinia', 'Sicily', 'Trentino-Alto Adige', 
    'Tuscany', 'Umbria', 'Veneto'
  ],
  // Spain
  'Spain': [
    'Navarra', 'Penedes', 'Priorato', 'Rias Baixas', 'Ribera del Duero', 'Rioja', 'Sherry'
  ],
  // United States
  'United States': [
    'California', 'Kentucky', 'New York', 'Oregon', 'Washington'
  ],
  // Germany
  'Germany': [
    'Mosel-Saar-Ruwer', 'Nahe', 'Pfalz', 'Rheingau', 'Rheinhessen'
  ],
  // Portugal
  'Portugal': [
    'Madeira', 'Port'
  ],
  // Australia
  'Australia': [
    'New South Wales', 'South Australia', 'Victoria', 'Western Australia'
  ],
  // Japan
  'Japan': [
    'Hokkaido', 'Honshu', 'Kyushu', 'Okinawa', 'Shikoku'
  ],
  // Mexico
  'Mexico': [
    'Chihuahua', 'Durango', 'Guerrero', 'Jalisco', 'Oaxaca', 'Puebla', 'San Luis Potosi'
  ],
  // Scotland (for whisky)
  'Scotland': [
    'Campbeltown', 'Highlands', 'Islands Other - Scotland', 'Islay', 'Lowland', 'Speyside'
  ]
};

// Wine sub-regions/appellations by region
const WINE_APPELLATIONS: Record<string, string[]> = {
  // France
  'Bordeaux': [
    'Margaux', 'Pauillac', 'Pessac-Leognan/Graves', 'Pomerol', 'Saint Emilion', 
    'Saint Estephe', 'Saint Julien', 'Sauternes'
  ],
  'Burgundy': [
    'Chambolle Musigny', 'Chassagne Montrachet', 'Corton', 'Gevrey Chambertin',
    'Meursault', 'Nuits Saint Georges', 'Puligny Montrachet', 'Volnay', 'Vosne Romanee', 'Vougeot'
  ],
  'Rhone': [
    'Chateauneuf du Pape', 'Cote Rotie', 'Gigondas', 'Hermitage/Crozes-Hermitage', 'Rasteau'
  ],
  'Armagnac': ['Armagnac-Tenareze', 'Bas-Armagnac'],
  'Calvados': ['Domfrontais', 'Pays d\'Auge'],
  'Cognac': ['Fine Bois', 'Grande Champagne'],
  
  // Italy
  'Piedmont': ['Barbaresco', 'Barolo'],
  'Tuscany': ['Brunello di Montalcino', 'Chianti', 'Super Tuscan'],
  
  // United States - California
  'California': [
    'Alexander Valley/Russian River', 'Anderson Valley/Mendocino', 'Carneros', 'Central Valley/Lodi',
    'Lake County', 'Livermore', 'Monterey/Carmel Valley', 'Napa Valley', 'Paso Robles',
    'Santa Cruz Mountains', 'Santa Lucia Highlands', 'Santa Maria/Santa Barbara', 
    'Sierra Foothills/El Dorado', 'Sonoma County'
  ],
  
  // Australia
  'South Australia': ['Adelaide Hills', 'Barossa Valley', 'Clare Valley', 'Coonawarra', 'Eden Valley', 'McLaren Vale'],
  'Victoria': ['Heathcote', 'Rutherglen', 'Yarra Valley'],
  'New South Wales': ['Hunter Valley'],
  'Western Australia': ['Margaret River'],
  
  // Scotland
  'Highlands': ['Eastern Highlands', 'Northern Highlands', 'Western Highlands'],
  'Islands Other - Scotland': ['Mull', 'Orkney', 'Skye'],
  'Islay': ['Lochindaal']
};

// Function to determine region from subregion
export function getRegionFromAppellation(appellation: string): string | undefined {
  for (const [region, appellations] of Object.entries(WINE_APPELLATIONS)) {
    if (appellations.includes(appellation)) {
      return region;
    }
  }
  return undefined;
}

// Function to determine country from region
export function getCountryFromRegion(region: string): string | undefined {
  for (const [country, regions] of Object.entries(WINE_REGIONS)) {
    if (regions.includes(region)) {
      return country;
    }
  }
  return undefined;
}

// Non-wine beverages to identify when filtering
const NON_WINE_SPIRITS_AND_BEVERAGES = [
  // Spirits and liquors
  'Armagnac',
  'Baijiu',
  'Bourbon',
  'Brandy',
  'Calvados',
  'Cognac',
  'Cordial',
  'Eau de Vie',
  'Gin',
  'Grappa',
  'Irish', // Irish Whiskey
  'Mezcal',
  'Rum',
  'Rye',
  'Scotch',
  'Tequila',
  'Vodka',
  'Whiskey',
  'Whisky',
  'Malt', // Malt Whisky
  
  // Beers
  'Belgian Ale',
  'Hard Seltzer',
  'India Pale Ale',
  'IPA',
  'Lager',
  'Pale Ale',
  'Pilsner',
  'Sour and Wild Ale',
  'Stout',
  'Porter',
  'Wheat Ale',
  
  // Other beverages
  'Cider',
  'Sake',
  'Mead',
  'Kombucha',
];

/**
 * Checks if the given product name is likely a wine or a different type of beverage
 * @param productName The name to check
 * @returns true if the product is likely wine, false if likely a different beverage
 */
export function isLikelyWine(productName: string): boolean {
  if (!productName) return true; // Default to wine if no name provided
  
  const lowerName = productName.toLowerCase();
  
  // Check against common non-wine beverages
  for (const nonWine of NON_WINE_SPIRITS_AND_BEVERAGES) {
    if (lowerName.includes(nonWine.toLowerCase())) {
      return false;
    }
  }
  
  // Common wine indicators
  const wineKeywords = ['wine', 'vino', 'vin', 'wein', 'cru', 'chateau', 'domaine', 'estate', 'bodega', 'vineyard'];
  for (const keyword of wineKeywords) {
    if (lowerName.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // Check if it contains a common grape variety
  const commonGrapes = [
    'cabernet', 'merlot', 'pinot', 'chardonnay', 'sauvignon', 'syrah', 'shiraz', 'malbec', 
    'zinfandel', 'riesling', 'grenache', 'tempranillo', 'sangiovese', 'nebbiolo'
  ];
  
  for (const grape of commonGrapes) {
    if (lowerName.includes(grape.toLowerCase())) {
      return true;
    }
  }
  
  // Default behavior: assume it's wine if we can't determine otherwise
  return true;
}

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
  
  // Common grape varieties to look for in wine names - sorted by category
  const commonGrapes = [
    // Red varieties
    'Barbera',
    'Cabernet Franc',
    'Cabernet Sauvignon',
    'Carignane', // Alternative spelling for Carignan
    'Carignan',
    'Carménère',
    'Cinsault',
    'Corvina',
    'Dolcetto',
    'Gamay',
    'Graciano',
    'Grenache',
    'Lagrein',
    'Malbec',
    'Mencia',
    'Merlot',
    'Monastrell',
    'Montepulciano',
    'Mourvèdre', // Correct spelling
    'Mouvedre', // Common misspelling
    'Nebbiolo',
    'Nero d\'Avola',
    'Petit Verdot',
    'Petite Sirah',
    'Pineau d\'Aunis',
    'Pinot Noir',
    'Pinotage',
    'Primitivo',
    'Sangiovese',
    'Shiraz', // Alternative name for Syrah
    'Syrah',
    'Tannat',
    'Tempranillo',
    'Touriga Nacional',
    'Zinfandel',
    'Aglianico',
    
    // White varieties
    'Albariño',
    'Arneis',
    'Assyrtiko',
    'Chardonnay',
    'Chenin Blanc',
    'Colombard',
    'Cortese',
    'Fiano',
    'Garganega',
    'Gewürztraminer',
    'Glera', // Used for Prosecco
    'Grenache Blanc',
    'Grüner Veltliner',
    'Marsanne',
    'Melon de Bourgogne', // Used for Muscadet
    'Müller-Thurgau',
    'Muscat',
    'Picpoul',
    'Pinot Blanc',
    'Pinot Gris',
    'Pinot Grigio', // Italian name for Pinot Gris
    'Riesling',
    'Romorantin',
    'Roussanne',
    'Sauvignon Blanc',
    'Sémillon',
    'Semillon', // Alternative spelling
    'Sylvaner',
    'Torrontés',
    'Trebbiano',
    'Verdejo',
    'Verdicchio',
    'Vermentino',
    'Viognier',
    'Viura', // Spanish name for Macabeo
    
    // Major blend categories
    'Rhone Blend',
    'Bordeaux Blend'
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
export function processWineTitle<T extends { name?: string | null; grapeVarieties?: string | null; vineyard?: string | null; producer?: string | null }>(
  wine: T
): T {
  if (!wine.name) return wine;
  
  const extractedGrapes = extractGrapeVarieties(wine.name, wine.grapeVarieties, wine.producer);
  const extractedVineyard = extractVineyard(wine.name, wine.vineyard);
  
  return {
    ...wine,
    grapeVarieties: extractedGrapes || wine.grapeVarieties || null,
    vineyard: extractedVineyard || wine.vineyard || null
  };
}
