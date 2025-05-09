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
  
  // Handle the special case of "Bordeaux components" or similar vague descriptions
  if (cleanedText.toLowerCase().includes("bordeaux component") || 
      cleanedText.toLowerCase().includes("bordeaux blend") ||
      cleanedText.toLowerCase().includes("bordeaux-style") ||
      cleanedText.toLowerCase().includes("bordeaux style")) {
    
    // If we know some specific varietals (typically mentioned alongside "Bordeaux components")
    if (cleanedText.toLowerCase().includes("cabernet sauvignon") || 
        cleanedText.toLowerCase().includes("merlot") ||
        cleanedText.toLowerCase().includes("cabernet franc")) {
      
      // Replace the vague "Bordeaux components" with specific Bordeaux varietals if not already mentioned
      let components = [];
      if (cleanedText.toLowerCase().includes("cabernet sauvignon")) components.push("Cabernet Sauvignon");
      if (cleanedText.toLowerCase().includes("merlot")) components.push("Merlot");
      if (cleanedText.toLowerCase().includes("cabernet franc")) components.push("Cabernet Franc");
      if (!cleanedText.toLowerCase().includes("petit verdot") && 
          (cleanedText.toLowerCase().includes("bordeaux"))) components.push("Petit Verdot");
      if (!cleanedText.toLowerCase().includes("malbec") && 
          (cleanedText.toLowerCase().includes("bordeaux"))) components.push("Malbec");
      
      // Only add it if it wasn't specified explicitly
      cleanedText = components.join(", ");
    } else {
      // If no specific varietals are mentioned, standardize to "Bordeaux Blend"
      cleanedText = "Bordeaux Blend";
    }
  }
  
  // For Quintarelli wines, they are typically Corvina, Corvinone, and Rondinella blend
  if (cleanedText.toLowerCase().includes("quintarelli") && 
      cleanedText.toLowerCase().includes("valpolicella")) {
    cleanedText = "Corvina, Corvinone, Rondinella";
  }
  
  // List of qualifying words and phrases to remove
  const qualifiers = [
    'dominant', 'primarily', 'mainly', 'predominantly', 'primary', 'mostly',
    'likely', 'possibly', 'probably', 'appears to be', 'seems to be', 'may contain',
    'small amounts of', 'small amount of', 'tiny amounts of', 'tiny amount of',
    'with some', 'with a bit of', 'with traces of', 'with a touch of',
    'blend of', 'blended with', 'blended from',
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
  
  // Clean up commas and spaces
  cleanedText = cleanedText.replace(/\s*,\s*/g, ', '); // Standardize spaces around commas
  cleanedText = cleanedText.replace(/\s+/g, ' '); // Replace multiple spaces with a single space
  cleanedText = cleanedText.replace(/,+/g, ','); // Replace multiple commas with a single comma
  cleanedText = cleanedText.replace(/^\s*,\s*/g, ''); // Remove leading commas
  cleanedText = cleanedText.replace(/\s*,\s*$/g, ''); // Remove trailing commas
  
  // Trim whitespace
  cleanedText = cleanedText.trim();
  
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