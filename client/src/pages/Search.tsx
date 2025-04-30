import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import TabNavigation from "@/components/ui/TabNavigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wine } from "@shared/schema";
import WineListItem from "@/components/wines/WineListItem";
import { Skeleton } from "@/components/ui/skeleton";
import SearchFilters from "@/components/search/SearchFilters";
import { useCellars } from "@/hooks/use-cellars";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wine as WineIcon, Search as SearchIcon, Sparkles } from "lucide-react";

interface WineRecommendationResult {
  recommendations: {
    wineId: number;
    wine: string;
    reasoning: string;
    characteristics: string;
    servingSuggestions: string;
    ageConsiderations: string;
    confidenceScore: number;
  }[];
  additionalSuggestions: string;
}

export default function Search() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Wine[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [aiQuery, setAiQuery] = useState("");
  const [recommendationResults, setRecommendationResults] = useState<WineRecommendationResult | null>(null);
  const [filters, setFilters] = useState({
    type: [] as string[],
    region: [] as string[],
    vintage: [] as number[],
    drinkingWindow: [] as string[],
    purchaseLocation: [] as string[],
    storageLocation: [] as string[],
    priceRange: undefined as [number, number] | undefined,
    purchaseDateRange: undefined as [Date, Date] | undefined,
    drinkingWindowRange: undefined as [Date, Date] | undefined
  });

  const { data: wines, isLoading } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines'],
  });
  
  const { cellars } = useCellars();
  
  // Mutation for getting AI wine recommendations
  const recommendMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/wine-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          wines: wines || []
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get wine recommendations');
      }
      
      const result = await response.json();
      return result.data as WineRecommendationResult;
    },
    onSuccess: (data) => {
      setRecommendationResults(data);
      toast({
        title: 'Recommendation Complete',
        description: 'AI has analyzed your cellar and found matches!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Recommendation Failed',
        description: error instanceof Error ? error.message : 'Failed to get recommendations',
      });
    }
  });

  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "Recommendations", href: "/recommendations" },
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
        
      // Filter by storage location
      const matchesStorageLocation = !filters.storageLocation?.length || 
        (wine.storageLocation && filters.storageLocation.includes(wine.storageLocation));

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
      
      // Filter by drinking window date range
      const matchesDrinkingWindowRange = !filters.drinkingWindowRange || 
        (wine.drinkingWindowStart && wine.drinkingWindowEnd && 
         new Date(wine.drinkingWindowStart) <= filters.drinkingWindowRange[1] && 
         new Date(wine.drinkingWindowEnd) >= filters.drinkingWindowRange[0]);
      
      return matchesQuery && 
             matchesType && 
             matchesRegion && 
             matchesVintage && 
             matchesDrinkingWindow && 
             matchesPurchaseLocation && 
             matchesStorageLocation &&
             matchesPriceRange && 
             matchesPurchaseDateRange &&
             matchesDrinkingWindowRange;
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
      
      // Handle array type filters (type, region, vintage, drinkingWindow, purchaseLocation, storageLocation)
      if (['type', 'region', 'vintage', 'drinkingWindow', 'purchaseLocation', 'storageLocation'].includes(filterType)) {
        if (isSelected) {
          // Add to filter
          if (filterType === 'vintage') {
            newFilters.vintage = [...prev.vintage, value as number];
          } else if (filterType === 'type' || filterType === 'region' || filterType === 'drinkingWindow' || 
                    filterType === 'purchaseLocation' || filterType === 'storageLocation') {
            const key = filterType as 'type' | 'region' | 'drinkingWindow' | 'purchaseLocation' | 'storageLocation';
            newFilters[key] = [...prev[key], value as string];
          }
        } else {
          // Remove from filter
          if (filterType === 'vintage') {
            newFilters.vintage = prev.vintage.filter(item => item !== value);
          } else if (filterType === 'type' || filterType === 'region' || filterType === 'drinkingWindow' || 
                    filterType === 'purchaseLocation' || filterType === 'storageLocation') {
            const key = filterType as 'type' | 'region' | 'drinkingWindow' | 'purchaseLocation' | 'storageLocation';
            newFilters[key] = prev[key].filter(item => item !== value);
          }
        }
      }
      
      return newFilters;
    });
  };
  
  // Function to handle range filter changes (price range, date ranges)
  const handleRangeFilterChange = (
    filterType: 'priceRange' | 'purchaseDateRange' | 'drinkingWindowRange', 
    value: [number, number] | [Date, Date]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (filterType === 'priceRange') {
        newFilters.priceRange = value as [number, number];
      } else if (filterType === 'purchaseDateRange') {
        newFilters.purchaseDateRange = value as [Date, Date];
      } else if (filterType === 'drinkingWindowRange') {
        newFilters.drinkingWindowRange = value as [Date, Date];
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
  
  // Combine storage locations from wine data and from cellars context
  const wineStorageLocations = getUniqueValues('storageLocation') as string[];
  
  // Manually ensure uniqueness by combining arrays
  const allStorageLocations: string[] = [];
  // First add all cellars
  cellars.forEach(cellar => {
    if (!allStorageLocations.includes(cellar)) {
      allStorageLocations.push(cellar);
    }
  });
  // Then add unique wine storage locations
  wineStorageLocations.forEach(location => {
    if (!allStorageLocations.includes(location)) {
      allStorageLocations.push(location);
    }
  });

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="Search" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <h1 className="text-2xl font-montserrat font-semibold text-burgundy-700 mb-6">Search Your Cellar</h1>
          
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="flex items-center">
                <SearchIcon className="w-4 h-4 mr-2" />
                Basic Search
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Recommendations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="pt-4">
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
                storageLocations={allStorageLocations}
                onFilterChange={handleFilterChange}
                onRangeFilterChange={handleRangeFilterChange}
                selectedFilters={filters}
              />
            </TabsContent>
            
            <TabsContent value="ai" className="pt-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">What would you like to drink?</h3>
                <p className="text-gray-600 mb-4">
                  Ask a natural language question like "I'm having ribeye steak tonight" or "What goes well with spicy Asian food?" 
                  Our AI sommelier will suggest wines from your cellar.
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (aiQuery.trim()) {
                    recommendMutation.mutate(aiQuery);
                  } else {
                    toast({
                      variant: 'destructive',
                      title: 'Empty Query',
                      description: 'Please enter a query to get recommendations.',
                    });
                  }
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="E.g., I'm having ribeye steak tonight..."
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Button 
                        type="submit"
                        className="w-full"
                        disabled={recommendMutation.isPending || isLoading || !wines?.length}
                      >
                        {recommendMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Finding Matches...
                          </>
                        ) : "Get Recommendations"}
                      </Button>
                    </div>
                  </div>
                  
                  {isLoading && (
                    <p className="text-sm text-gray-500 mt-2">Loading your wine collection...</p>
                  )}
                  
                  {wines?.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">
                      You need wines in your cellar to get recommendations.
                    </p>
                  )}
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Basic search results */}
        {hasSearched && activeTab === 'basic' && (
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
                    type: [] as string[],
                    region: [] as string[],
                    vintage: [] as number[],
                    drinkingWindow: [] as string[],
                    purchaseLocation: [] as string[],
                    storageLocation: [] as string[],
                    priceRange: undefined,
                    purchaseDateRange: undefined,
                    drinkingWindowRange: undefined
                  });
                }} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* AI recommendation results */}
        {activeTab === 'ai' && recommendationResults && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h2 className="text-xl font-montserrat font-semibold text-burgundy-700">Wine Recommendations</h2>
                <p className="text-gray-600 text-sm">Based on: "{aiQuery}"</p>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAiQuery("");
                    setRecommendationResults(null);
                  }}
                  size="sm"
                >
                  New Recommendation
                </Button>
              </div>
            </div>
            
            {recommendationResults.recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendationResults.recommendations.map((rec, index) => {
                  const wine = wines?.find(w => w.id === rec.wineId);
                  if (!wine) return null;
                  
                  return (
                    <Card key={index} className="border-burgundy-100">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-medium text-burgundy-700">{rec.wine}</h3>
                                <p className="text-sm text-gray-600">
                                  {wine.region && `${wine.region}`}
                                  {wine.vintage && wine.region && ` • `}
                                  {wine.vintage === 0 ? "NV" : wine.vintage}
                                </p>
                              </div>
                              <div>
                                {rec.confidenceScore >= 0.8 ? (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Strong Match</Badge>
                                ) : rec.confidenceScore >= 0.6 ? (
                                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Good Match</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Possible Match</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <h4 className="text-sm font-medium mb-1 flex items-center">
                                <WineIcon className="h-4 w-4 mr-1 text-burgundy-600" />
                                Perfect Match Because:
                              </h4>
                              <p className="text-sm text-gray-600">{rec.reasoning}</p>
                            </div>
                            
                            <div className="mb-3">
                              <h4 className="text-sm font-medium mb-1">Flavor Profile:</h4>
                              <p className="text-sm text-gray-600">{rec.characteristics}</p>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-1">Serving Suggestions:</h4>
                              <p className="text-sm text-gray-600">{rec.servingSuggestions}</p>
                            </div>

                            <div className="mt-3">
                              <h4 className="text-sm font-medium mb-1">Age Considerations:</h4>
                              <p className="text-sm text-gray-600">{rec.ageConsiderations}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">No specific recommendations found for your query.</p>
                </CardContent>
              </Card>
            )}
            
            {recommendationResults.additionalSuggestions && (
              <div className="mt-6">
                <Separator className="my-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Additional Suggestions</h3>
                <p className="text-gray-600">{recommendationResults.additionalSuggestions}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
