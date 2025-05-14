/**
 * Shared wine utility functions used on both client and server
 */

/**
 * Clean up grape varieties text by removing qualifying words 
 * and uncertain language that would interfere with filtering
 * @param grapeVarieties The grape varieties text to clean
 * @returns Cleaned grape varieties text
 */
export function cleanGrapeVarieties(grapeVarieties: string | null | undefined): string | undefined {
  if (!grapeVarieties) return undefined;
  
  let cleanedText = grapeVarieties;
  
  // Handle "Bordeaux blend" terminology consistently
  if (cleanedText.toLowerCase().includes("bordeaux blend")) {
    // If specific varietals are already mentioned, extract them
    if (cleanedText.toLowerCase().includes("cabernet") || 
        cleanedText.toLowerCase().includes("merlot")) {
      // Try to extract the mentioned varietals
      const matches = cleanedText.match(/\b(cabernet sauvignon|cabernet franc|merlot|petit verdot|malbec)\b/gi);
      if (matches && matches.length > 0) {
        // Format the found varietals with proper capitalization
        cleanedText = matches.map(match => {
          // Capitalize first letter of each word
          return match.replace(/\b\w/g, c => c.toUpperCase());
        }).join(', ');
      }
    } else {
      // Otherwise, standardize to common Bordeaux varietals
      cleanedText = "Cabernet Sauvignon, Merlot, Cabernet Franc, Petit Verdot, Malbec";
    }
  }
  
  // Remove articles and common prefixes that shouldn't be part of grape names
  cleanedText = cleanedText.replace(/^a |^an |^the /gi, '');
  
  // List of qualifying words and phrases to remove
  const qualifiers = [
    'dominant', 'primarily', 'mainly', 'predominantly', 'primary', 'mostly',
    'likely', 'possibly', 'probably', 'appears to be', 'seems to be', 'may contain',
    'small amounts of', 'small amount of', 'tiny amounts of', 'tiny amount of',
    'with some', 'with a bit of', 'with traces of', 'with a touch of',
    'blend of', 'blended with', 'blended from', 'a blend of', 'a touch of',
    'other', 'plus', 'including', 'such as', 'along with'
  ];
  
  // Remove qualifying phrases
  qualifiers.forEach(qualifier => {
    // Create regex that handles the word with proper word boundaries
    const regex = new RegExp(`\\b${qualifier}\\b`, 'gi');
    cleanedText = cleanedText.replace(regex, '');
  });
  
  // Remove additional patterns like "X% Y" or "X percent Y"
  cleanedText = cleanedText.replace(/\d+%\s+/g, '');
  cleanedText = cleanedText.replace(/\d+\s+percent\s+/gi, '');
  
  // Remove text in parentheses like "(where Hall Wines is based)"
  cleanedText = cleanedText.replace(/\([^)]*\)/g, '');
  
  // Remove common extra words
  cleanedText = cleanedText.replace(/varieties/gi, '');
  cleanedText = cleanedText.replace(/variety/gi, '');
  
  // Replace "and" with commas for better filtering
  cleanedText = cleanedText.replace(/\s+and\s+/gi, ', ');
  
  // Fix instances of consecutive commas caused by removed content
  cleanedText = cleanedText.replace(/,\s*,/g, ',');
  
  // Clean up commas and spaces
  cleanedText = cleanedText.replace(/\s*,\s*/g, ', '); // Standardize spaces around commas
  cleanedText = cleanedText.replace(/\s+/g, ' '); // Replace multiple spaces with a single space
  cleanedText = cleanedText.replace(/,+/g, ','); // Replace multiple commas with a single comma
  cleanedText = cleanedText.replace(/^\s*,\s*/g, ''); // Remove leading commas
  cleanedText = cleanedText.replace(/\s*,\s*$/g, ''); // Remove trailing commas
  
  // Trim whitespace
  cleanedText = cleanedText.trim();
  
  // Split by comma, filter empty entries, and rejoin
  if (cleanedText.includes(',')) {
    cleanedText = cleanedText.split(',')
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0)
      .join(', ');
  }
  
  // Special handling for Valpolicella wines if they mention Valpolicella but don't have the correct grapes
  if (cleanedText.toLowerCase().includes("valpolicella") && 
      !cleanedText.toLowerCase().includes("corvina") &&
      !cleanedText.toLowerCase().includes("corvinone") && 
      !cleanedText.toLowerCase().includes("rondinella")) {
    // Replace with the standard blend for this region
    return "Corvina, Corvinone, Rondinella";
  }
  
  return cleanedText || undefined;
}

/**
 * Clean up location text by removing qualifying words and uncertain language
 * @param location The location text to clean
 * @returns Cleaned location text
 */
export function cleanLocation(location: string | null | undefined): string | undefined {
  if (!location) return undefined;
  
  // List of qualifying words and phrases to remove
  const qualifiers = [
    'likely', 'possibly', 'probably', 'appears to be', 'seems to be', 'may be',
    'most likely', 'potentially', 'presumably', 'where', 'located in', 'based in'
  ];
  
  let cleanedText = location;
  
  // Remove qualifying phrases
  qualifiers.forEach(qualifier => {
    // Create regex that handles the word with proper word boundaries
    const regex = new RegExp(`\\b${qualifier}\\b`, 'gi');
    cleanedText = cleanedText.replace(regex, '');
  });
  
  // Remove text in parentheses like "(where Hall Wines is based)"
  cleanedText = cleanedText.replace(/\([^)]*\)/g, '');
  
  // Clean up commas and spaces
  cleanedText = cleanedText.replace(/\s*,\s*/g, ', '); // Standardize spaces around commas
  cleanedText = cleanedText.replace(/\s+/g, ' '); // Replace multiple spaces with a single space
  
  // Trim whitespace
  cleanedText = cleanedText.trim();
  
  return cleanedText || undefined;
}