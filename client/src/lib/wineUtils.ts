/**
 * Utilities for working with wine data on the client side
 */

interface WineBasicInfo {
  producer: string;
  name: string;
  vintage: number;
}

/**
 * Extract grape varieties from a wine name
 * @param wineName Name of the wine to analyze
 * @returns Extracted grape varieties or null if none found
 */
export function extractGrapeVarieties(wineName: string): string | null {
  if (!wineName) return null;
  
  // Common grape varieties to look for
  const grapeList = [
    'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Shiraz',
    'Zinfandel', 'Malbec', 'Grenache', 'Tempranillo', 'Sangiovese',
    'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Gris', 'Pinot Grigio',
    'Gewürztraminer', 'Viognier', 'Sémillon', 'Chenin Blanc', 'Moscato',
    'Nebbiolo', 'Barbera', 'Cabernet Franc', 'Petit Verdot', 'Mourvèdre',
    'Carignan', 'Cinsault', 'Gamay', 'Carménère', 'Petite Sirah'
  ];
  
  // Common blend names to detect
  const blendTerms = [
    'Red Blend', 'White Blend', 'Rosé Blend', 'Bordeaux Blend',
    'GSM', 'Meritage', 'Cuvée', 'Field Blend', 'Claret'
  ];
  
  // Check for blend terms first
  for (const blend of blendTerms) {
    if (wineName.includes(blend)) {
      return blend;
    }
  }
  
  // Look for grape varieties in the name
  const foundGrapes = [];
  for (const grape of grapeList) {
    if (wineName.toLowerCase().includes(grape.toLowerCase())) {
      foundGrapes.push(grape);
    }
  }
  
  if (foundGrapes.length > 0) {
    return foundGrapes.join(', ');
  }
  
  return null;
}

/**
 * Extract vineyard information from a wine name
 * @param wineName Name of the wine to analyze
 * @returns Extracted vineyard or null if none found
 */
export function extractVineyard(wineName: string): string | null {
  if (!wineName) return null;
  
  // Look for common vineyard indicators
  const vineyardIndicators = [
    'Vineyard', 'Estate', 'Cru', 'Grand Cru', 'Premier Cru',
    'Vigna', 'Clos', 'Domaine', 'Château', 'Tenuta'
  ];
  
  for (const indicator of vineyardIndicators) {
    const regex = new RegExp(`(\\w+\\s+${indicator})|(${indicator}\\s+\\w+)`, 'i');
    const match = wineName.match(regex);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

/**
 * Look up wine information using an external API
 * @param wineName The name of the wine
 * @param producer The producer of the wine (optional)
 * @param vintage The vintage year (optional)
 * @returns Promise with wine information
 */
export async function lookupWineInformation(
  wineName: string,
  producer?: string,
  vintage?: number | string
): Promise<any> {
  try {
    const query = {
      wineName,
      producer,
      vintage: vintage ? String(vintage) : undefined
    };
    
    const response = await fetch('/api/wine-info-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to lookup wine information');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error looking up wine information:', error);
    throw error;
  }
}

/**
 * Clean grape varieties by removing qualifying words
 * @param grapeVarieties Grape varieties with potential qualifiers
 * @returns Cleaned grape varieties string
 */
export function cleanGrapeVarieties(grapeVarieties: string | null): string | null {
  if (!grapeVarieties) return null;
  
  // Remove qualifying words like "predominantly", "likely", "possibly", etc.
  const qualifyingWords = [
    'predominantly', 'likely', 'possibly', 'primarily', 'probably',
    'mainly', 'mostly', 'appears to be', 'might be', 'could be',
    'seems to be', 'perhaps', 'potentially', 'possibly a', 'likely a',
    'may contain', 'may include', 'typically', 'traditionally'
  ];
  
  let cleaned = grapeVarieties;
  
  // Remove qualifying words
  qualifyingWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Replace "and" with comma for consistent format
  cleaned = cleaned.replace(/ and /gi, ', ');
  
  // Clean up extra whitespace and commas
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/,\s*,/g, ',').trim();
  cleaned = cleaned.replace(/^,|,$/g, '').trim();
  
  return cleaned;
}

/**
 * Clean location information by removing qualifying words
 * @param location Location string with potential qualifiers
 * @returns Cleaned location string
 */
export function cleanLocation(location: string | null): string | null {
  if (!location) return null;
  
  // Remove qualifying words and uncertainty phrases
  const uncertaintyPhrases = [
    'likely', 'possibly', 'probably', 'appears to be',
    'might be', 'could be', 'seems to be', 'perhaps', 
    'potentially', 'possibly from', 'likely from',
    'may be from', 'I believe', 'I think', 'uncertain',
    'not certain', 'not sure', 'unclear'
  ];
  
  let cleaned = location;
  
  // Remove uncertainty phrases
  uncertaintyPhrases.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Check if a wine might be a duplicate in the collection
 * @param existingWine The existing wine from the collection
 * @param newWine The new wine to check
 * @returns true if likely duplicate, false otherwise
 */
export function checkDuplicateWine(existingWine: any, newWine: WineBasicInfo): boolean {
  // If producer doesn't match, it's not a duplicate
  if (!existingWine.producer || !newWine.producer) return false;
  
  const normalizeStr = (str: string) => 
    str.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const existingProducer = normalizeStr(existingWine.producer);
  const newProducer = normalizeStr(newWine.producer);
  
  // Producer names must match
  if (existingProducer !== newProducer) return false;
  
  // If vintage doesn't match, it's not a duplicate (could be same wine, different year)
  if (existingWine.vintage !== newWine.vintage) return false;
  
  // If wine has a name, check if it matches
  if (existingWine.name && newWine.name) {
    const existingName = normalizeStr(existingWine.name);
    const newName = normalizeStr(newWine.name);
    
    return existingName === newName;
  }
  
  // If we got here, the producer and vintage match, and either one or both wines don't have names
  // This is a likely duplicate - better to flag it for review
  return true;
}

/**
 * Format a drinking window for display
 * @param startYear Start year of drinking window
 * @param endYear End year of drinking window
 * @returns Formatted drinking window string
 */
export function formatDrinkingWindow(startYear: number | null, endYear: number | null): string {
  if (!startYear && !endYear) return 'Not specified';
  if (startYear && !endYear) return `${startYear}+`;
  if (!startYear && endYear) return `Until ${endYear}`;
  return `${startYear} - ${endYear}`;
}

/**
 * Gets the current drinking status based on drinking window
 * @param startYear Start year of drinking window
 * @param endYear End year of drinking window
 * @returns Drinking status string
 */
export function getDrinkingStatus(startYear: number | null, endYear: number | null): 'drink_now' | 'drink_later' | 'past_prime' {
  const currentYear = new Date().getFullYear();
  
  if (!startYear && !endYear) return 'drink_now';
  
  if (startYear && currentYear < startYear) {
    return 'drink_later';
  }
  
  if (endYear && currentYear > endYear) {
    return 'past_prime';
  }
  
  return 'drink_now';
}