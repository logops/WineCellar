import { cleanGrapeVarieties, cleanLocation } from './shared/wineUtils';

// Test various grape variety formats
const grapeTests = [
  "Primarily Cabernet Sauvignon with some Merlot",
  "80% Cabernet Sauvignon and 20% Merlot",
  "Bordeaux blend with Cabernet Sauvignon dominant",
  "Bordeaux blend",
  "Likely Corvina, possibly Rondinella and other Valpolicella varieties",
  "Chardonnay and Pinot Noir",
  "A blend of Grenache, Syrah, and a touch of Mourvedre"
];

console.log("=== Testing Grape Variety Cleaning ===");
grapeTests.forEach(test => {
  console.log(`Original: "${test}"`);
  console.log(`Cleaned: "${cleanGrapeVarieties(test)}"`);
  console.log('---');
});

// Test location cleaning
const locationTests = [
  "Likely from Napa Valley, California",
  "Appears to be from Bordeaux, France",
  "Presumably Chianti Classico DOCG (where the winery is based)",
  "Mosel, Germany",
  "Located in Barolo DOCG, possibly Monforte d'Alba"
];

console.log("\n=== Testing Location Cleaning ===");
locationTests.forEach(test => {
  console.log(`Original: "${test}"`);
  console.log(`Cleaned: "${cleanLocation(test)}"`);
  console.log('---');
});