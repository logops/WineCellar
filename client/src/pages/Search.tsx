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
    drinkingWindow: [] as string[]
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
      
      return matchesQuery && matchesType && matchesRegion && matchesVintage && matchesDrinkingWindow;
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
    }
    
    setSearchResults(sortedResults);
  };

  const handleFilterChange = (filterType: keyof typeof filters, value: string | number, isSelected: boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (isSelected) {
        // Add to filter
        if (typeof value === 'string') {
          newFilters[filterType] = [...prev[filterType] as string[], value as string];
        } else {
          newFilters[filterType] = [...prev[filterType] as number[], value as number];
        }
      } else {
        // Remove from filter
        if (typeof value === 'string') {
          newFilters[filterType] = (prev[filterType] as string[]).filter(item => item !== value);
        } else {
          newFilters[filterType] = (prev[filterType] as number[]).filter(item => item !== value);
        }
      }
      
      return newFilters;
    });
  };

  // Extract unique values for filters from wines
  const getUniqueValues = (key: keyof Wine) => {
    if (!wines) return [];
    
    const values = wines.map(wine => wine[key])
      .filter(value => value !== undefined && value !== null && value !== '');
    
    return [...new Set(values)];
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
                    drinkingWindow: []
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
