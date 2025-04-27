import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TabNavigation from "@/components/ui/TabNavigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wine } from "@shared/schema";
import WineListItem from "@/components/wines/WineListItem";
import { Skeleton } from "@/components/ui/skeleton";
import SearchFilters from "@/components/search/SearchFilters";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Wine[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [filters, setFilters] = useState({
    type: [] as string[],
    region: [] as string[],
    vintage: [] as number[],
    drinkingWindow: [] as string[],
    purchaseLocation: [] as string[],
    priceRange: undefined as [number, number] | undefined,
    purchaseDateRange: undefined as [Date, Date] | undefined
  });

  const { data: wines, isLoading } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines'],
  });

  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "My Notes", href: "/notes" },
    { label: "Statistics", href: "/statistics" },
  ];

  const handleSearch = () => {
    if (!wines) return;
    
    setHasSearched(true);
    
    const filtered = wines.filter(wine => {
      // Basic text search
      const matchesQuery = !searchQuery || 
        (wine.name && wine.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (wine.producer && wine.producer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (wine.region && wine.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (wine.grapeVarieties && wine.grapeVarieties.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by type
      const matchesType = filters.type.length === 0 || 
        (wine.type && filters.type.includes(wine.type));
      
      // Filter by region
      const matchesRegion = filters.region.length === 0 || 
        (wine.region && filters.region.includes(wine.region));
      
      // Filter by vintage
      const matchesVintage = filters.vintage.length === 0 || 
        (wine.vintage && filters.vintage.includes(wine.vintage));
      
      // Filter by drinking window
      const matchesDrinkingWindow = filters.drinkingWindow.length === 0 || 
        (wine.drinkingStatus && filters.drinkingWindow.includes(wine.drinkingStatus));

      // Filter by purchase location
      const matchesPurchaseLocation = !filters.purchaseLocation?.length || 
        (wine.purchaseLocation && filters.purchaseLocation.includes(wine.purchaseLocation));

      // Filter by price range
      const matchesPriceRange = !filters.priceRange || 
        (wine.currentValue !== null && 
         wine.currentValue !== undefined && 
         wine.currentValue >= filters.priceRange[0] && 
         wine.currentValue <= filters.priceRange[1]);

      // Filter by purchase date range
      const matchesPurchaseDateRange = !filters.purchaseDateRange || 
        (wine.purchaseDate && 
         new Date(wine.purchaseDate) >= filters.purchaseDateRange[0] && 
         new Date(wine.purchaseDate) <= filters.purchaseDateRange[1]);
      
      return matchesQuery && 
             matchesType && 
             matchesRegion && 
             matchesVintage && 
             matchesDrinkingWindow && 
             matchesPurchaseLocation && 
             matchesPriceRange && 
             matchesPurchaseDateRange;
    });
    
    // Sort results
    let sortedResults = [...filtered];
    
    switch (sortBy) {
      case 'name-asc':
        sortedResults.sort((a, b) => `${a.producer} ${a.name}`.localeCompare(`${b.producer} ${b.name}`));
        break;
      case 'name-desc':
        sortedResults.sort((a, b) => `${b.producer} ${b.name}`.localeCompare(`${a.producer} ${a.name}`));
        break;
      case 'vintage-asc':
        sortedResults.sort((a, b) => (a.vintage || 0) - (b.vintage || 0));
        break;
      case 'vintage-desc':
        sortedResults.sort((a, b) => (b.vintage || 0) - (a.vintage || 0));
        break;
      case 'value-asc':
        sortedResults.sort((a, b) => (a.currentValue || 0) - (b.currentValue || 0));
        break;
      case 'value-desc':
        sortedResults.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
        break;
      case 'purchase-date-asc':
        sortedResults.sort((a, b) => {
          if (!a.purchaseDate) return 1;
          if (!b.purchaseDate) return -1;
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        });
        break;
      case 'purchase-date-desc':
        sortedResults.sort((a, b) => {
          if (!a.purchaseDate) return 1;
          if (!b.purchaseDate) return -1;
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        });
        break;
    }
    
    setSearchResults(sortedResults);
  };

  const handleFilterChange = (filterType: string, value: string | number, isSelected: boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      // Handle array type filters (type, region, vintage, drinkingWindow, purchaseLocation)
      if (['type', 'region', 'vintage', 'drinkingWindow', 'purchaseLocation'].includes(filterType)) {
        if (isSelected) {
          // Add to filter
          if (filterType === 'vintage') {
            newFilters.vintage = [...prev.vintage, value as number];
          } else if (filterType === 'type' || filterType === 'region' || filterType === 'drinkingWindow' || filterType === 'purchaseLocation') {
            const key = filterType as 'type' | 'region' | 'drinkingWindow' | 'purchaseLocation';
            newFilters[key] = [...prev[key], value as string];
          }
        } else {
          // Remove from filter
          if (filterType === 'vintage') {
            newFilters.vintage = prev.vintage.filter(item => item !== value);
          } else if (filterType === 'type' || filterType === 'region' || filterType === 'drinkingWindow' || filterType === 'purchaseLocation') {
            const key = filterType as 'type' | 'region' | 'drinkingWindow' | 'purchaseLocation';
            newFilters[key] = prev[key].filter(item => item !== value);
          }
        }
      }
      
      return newFilters;
    });
  };
  
  // Function to handle range filter changes (price range, date range)
  const handleRangeFilterChange = (filterType: 'priceRange' | 'purchaseDateRange', value: [number, number] | [Date, Date]) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (filterType === 'priceRange') {
        newFilters.priceRange = value as [number, number];
      } else if (filterType === 'purchaseDateRange') {
        newFilters.purchaseDateRange = value as [Date, Date];
      }
      return newFilters;
    });
  };

  // Extract unique values for filters from wines
  const getUniqueValues = (key: keyof Wine) => {
    if (!wines) return [];
    
    const values = wines.map(wine => wine[key])
      .filter(value => value !== undefined && value !== null && value !== '');
    
    // Instead of using Set directly, we'll manually handle the uniqueness
    const uniqueValues: any[] = [];
    values.forEach(value => {
      if (!uniqueValues.includes(value)) {
        uniqueValues.push(value);
      }
    });
    
    return uniqueValues;
  };

  const uniqueTypes = getUniqueValues('type') as string[];
  const uniqueRegions = getUniqueValues('region') as string[];
  const uniqueVintages = getUniqueValues('vintage') as number[];

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="Search" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <h1 className="text-2xl font-montserrat font-semibold text-burgundy-700 mb-6">Search Your Cellar</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by name, producer, region, or grape varieties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Button 
                onClick={handleSearch} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Search"}
              </Button>
            </div>
          </div>
          
          <SearchFilters 
            types={uniqueTypes}
            regions={uniqueRegions}
            vintages={uniqueVintages}
            onFilterChange={handleFilterChange}
            onRangeFilterChange={handleRangeFilterChange}
            selectedFilters={filters}
          />
        </div>
        
        {hasSearched && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h2 className="text-xl font-montserrat font-semibold text-burgundy-700">Search Results</h2>
                <p className="text-gray-600 text-sm">Found {searchResults.length} wines</p>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <Select onValueChange={setSortBy} defaultValue="default">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Sort by Default</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z-A</SelectItem>
                    <SelectItem value="vintage-asc">Vintage: Oldest First</SelectItem>
                    <SelectItem value="vintage-desc">Vintage: Newest First</SelectItem>
                    <SelectItem value="value-desc">Value: High to Low</SelectItem>
                    <SelectItem value="value-asc">Value: Low to High</SelectItem>
                    <SelectItem value="purchase-date-asc">Purchase Date: Oldest First</SelectItem>
                    <SelectItem value="purchase-date-desc">Purchase Date: Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(wine => (
                  <WineListItem key={wine.id} wine={wine} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No wines match your search criteria</p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    type: [],
                    region: [],
                    vintage: [],
                    drinkingWindow: [],
                    purchaseLocation: [],
                    priceRange: undefined,
                    purchaseDateRange: undefined
                  });
                }} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
