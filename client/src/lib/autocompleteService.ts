import { useQuery } from "@tanstack/react-query";
import { Wine } from "@shared/schema";

// Get unique values from a field across all wines
function getUniqueValues(wines: Wine[], field: keyof Wine): string[] {
  // Filter out undefined, null or empty values
  const values = wines
    .map((wine) => wine[field])
    .filter((value): value is string => 
      typeof value === 'string' && value.trim() !== ''
    );
  
  // Get unique values and sort alphabetically
  return Array.from(new Set(values)).sort();
}

// Hook for getting autocomplete suggestions
export function useAutocompleteSuggestions() {
  const { data: wines = [] } = useQuery<Wine[]>({
    queryKey: ['/api/wines'],
  });

  // Get unique values for each relevant field
  const producers = getUniqueValues(wines, 'producer');
  const regions = getUniqueValues(wines, 'region');
  const subregions = getUniqueValues(wines, 'subregion');
  const vineyards = getUniqueValues(wines, 'vineyard');
  const grapeVarieties = wines
    .map(wine => wine.grapeVarieties)
    .filter((value): value is string => 
      typeof value === 'string' && value.trim() !== ''
    )
    .flatMap(varieties => varieties.split(',').map(v => v.trim()))
    .filter(variety => variety !== '')
    .reduce<string[]>((unique, item) => {
      return unique.includes(item) ? unique : [...unique, item];
    }, [])
    .sort();
  
  const purchaseLocations = getUniqueValues(wines, 'purchaseLocation');

  // Common regions and countries for wine
  const commonRegions = [
    // France
    "Bordeaux", "Burgundy", "Champagne", "Rhône", "Loire Valley", "Alsace", "Provence",
    // Italy
    "Tuscany", "Piedmont", "Veneto", "Sicily", "Lombardy", "Puglia", "Trentino-Alto Adige",
    // Spain
    "Rioja", "Ribera del Duero", "Priorat", "Navarra", "Rias Baixas", 
    // United States
    "Napa Valley", "Sonoma", "Willamette Valley", "Central Coast", "Washington State",
    // Other
    "Mendoza", "Barossa Valley", "Marlborough", "Mosel", "Porto", "Douro"
  ];

  // Common countries
  const commonCountries = [
    "France", "Italy", "Spain", "United States", "Argentina", "Australia", 
    "New Zealand", "Germany", "Portugal", "Chile", "South Africa"
  ];

  // Combine with any existing regions from the user's collection
  const allRegions = Array.from(new Set([...regions, ...commonRegions])).sort();
  
  // Common grapes
  const commonGrapes = [
    // Red
    "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah", "Shiraz", "Malbec", 
    "Zinfandel", "Sangiovese", "Nebbiolo", "Tempranillo", "Grenache", "Cabernet Franc",
    // White
    "Chardonnay", "Sauvignon Blanc", "Riesling", "Pinot Grigio", "Pinot Gris",
    "Gewürztraminer", "Viognier", "Chenin Blanc", "Albariño", "Sémillon"
  ];

  // Combine with any existing grape varieties from the user's collection
  const allGrapes = Array.from(new Set([...grapeVarieties, ...commonGrapes])).sort();

  return {
    producers,
    regions: allRegions,
    subregions,
    vineyards,
    grapeVarieties: allGrapes,
    purchaseLocations,
    countries: commonCountries
  };
}