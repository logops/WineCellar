import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown, 
  ChevronUp, 
  Filter,
  SlidersHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchFiltersProps {
  types: string[];
  regions: string[];
  vintages: number[];
  selectedFilters: {
    type: string[];
    region: string[];
    vintage: number[];
    drinkingWindow: string[];
    purchaseLocation?: string[];
    priceRange?: [number, number];
    purchaseDateRange?: [Date, Date];
    drinkingWindowRange?: [Date, Date];
  };
  onFilterChange: (filterType: string, value: string | number, isSelected: boolean) => void;
  onRangeFilterChange?: (filterType: "priceRange" | "purchaseDateRange" | "drinkingWindowRange", value: [number, number] | [Date, Date]) => void;
}

export default function SearchFilters({
  types,
  regions,
  vintages,
  selectedFilters,
  onFilterChange,
  onRangeFilterChange
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getWineTypeName = (type: string): string => {
    switch (type) {
      case 'red': return 'Red Wine';
      case 'white': return 'White Wine';
      case 'rose': return 'Rosé';
      case 'sparkling': return 'Sparkling Wine';
      case 'dessert': return 'Dessert Wine';
      case 'fortified': return 'Fortified Wine';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getDrinkingWindowName = (status: string): string => {
    switch (status) {
      case 'drink_now': return 'Drink Now';
      case 'drink_later': return 'Drink Later';
      case 'custom': return 'Custom Window';
      default: return status.replace('_', ' ');
    }
  };

  // Sort vintages in descending order
  const sortedVintages = [...vintages].sort((a, b) => b - a);

  // Count total active filters
  const activeFilterCount = 
    selectedFilters.type.length + 
    selectedFilters.region.length + 
    selectedFilters.vintage.length + 
    selectedFilters.drinkingWindow.length + 
    (selectedFilters.purchaseLocation?.length || 0);

  const [activeTab, setActiveTab] = useState("all");
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border border-cream-200 rounded-xl shadow-sm overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full flex justify-between items-center p-5 h-auto"
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-burgundy-600" />
            <span className="font-medium text-burgundy-700">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="bg-burgundy-100 text-burgundy-800 hover:bg-burgundy-100">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-5 border-t border-cream-200">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-5">
          <TabsList className="bg-cream-100 p-1">
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              All Filters
            </TabsTrigger>
            <TabsTrigger value="characteristics" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Characteristics
            </TabsTrigger>
            <TabsTrigger value="purchase" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Purchase Info
            </TabsTrigger>
            <TabsTrigger value="drinking" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Drinking Window
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {(activeTab === "all" || activeTab === "characteristics") && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Wine Type Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Wine Type
                {selectedFilters.type.length > 0 && (
                  <Badge variant="outline" className="ml-auto">{selectedFilters.type.length}</Badge>
                )}
              </h3>
              <div className="space-y-2">
                {types.map(type => (
                  <div key={type} className="flex items-center">
                    <Checkbox 
                      id={`type-${type}`}
                      checked={selectedFilters.type.includes(type)}
                      onCheckedChange={(checked) => {
                        onFilterChange('type', type, checked === true);
                      }}
                      className="text-burgundy-600 border-cream-300"
                    />
                    <label 
                      htmlFor={`type-${type}`}
                      className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {getWineTypeName(type)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Region Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Region
                {selectedFilters.region.length > 0 && (
                  <Badge variant="outline" className="ml-auto">{selectedFilters.region.length}</Badge>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {regions.map(region => (
                  <div key={region} className="flex items-center">
                    <Checkbox 
                      id={`region-${region}`}
                      checked={selectedFilters.region.includes(region)}
                      onCheckedChange={(checked) => {
                        onFilterChange('region', region, checked === true);
                      }}
                      className="text-burgundy-600 border-cream-300"
                    />
                    <label 
                      htmlFor={`region-${region}`}
                      className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {region}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Vintage Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Vintage
                {selectedFilters.vintage.length > 0 && (
                  <Badge variant="outline" className="ml-auto">{selectedFilters.vintage.length}</Badge>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {sortedVintages.map(vintage => (
                  <div key={vintage} className="flex items-center">
                    <Checkbox 
                      id={`vintage-${vintage}`}
                      checked={selectedFilters.vintage.includes(vintage)}
                      onCheckedChange={(checked) => {
                        onFilterChange('vintage', vintage, checked === true);
                      }}
                      className="text-burgundy-600 border-cream-300"
                    />
                    <label 
                      htmlFor={`vintage-${vintage}`}
                      className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {vintage}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {(activeTab === "all" || activeTab === "purchase") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Purchase Date Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Purchase Date Range
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center bg-white rounded-md border border-cream-300 p-2">
                    <span className="text-gray-500 text-sm w-12">From:</span>
                    <input
                      type="date"
                      className="w-full outline-none text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          const fromDate = new Date(e.target.value);
                          const toDate = selectedFilters.purchaseDateRange ? 
                            selectedFilters.purchaseDateRange[1] : 
                            new Date();
                          
                          onRangeFilterChange && onRangeFilterChange(
                            'purchaseDateRange', 
                            [fromDate, toDate] as [Date, Date]
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center bg-white rounded-md border border-cream-300 p-2">
                    <span className="text-gray-500 text-sm w-12">To:</span>
                    <input
                      type="date"
                      className="w-full outline-none text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          const fromDate = selectedFilters.purchaseDateRange ? 
                            selectedFilters.purchaseDateRange[0] : 
                            new Date(2000, 0, 1);
                          const toDate = new Date(e.target.value);
                          
                          onRangeFilterChange && onRangeFilterChange(
                            'purchaseDateRange', 
                            [fromDate, toDate] as [Date, Date]
                          );
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Price Range Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Price Range
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center bg-white rounded-md border border-cream-300 p-2">
                    <span className="text-gray-500 text-sm w-10">Min:</span>
                    <input
                      type="number"
                      className="w-full outline-none text-sm"
                      placeholder="0"
                      min="0"
                      onChange={(e) => {
                        const minPrice = parseFloat(e.target.value) || 0;
                        const maxPrice = selectedFilters.priceRange ? 
                          selectedFilters.priceRange[1] : 1000;
                        
                        onRangeFilterChange && onRangeFilterChange(
                          'priceRange', 
                          [minPrice, maxPrice] as [number, number]
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center bg-white rounded-md border border-cream-300 p-2">
                    <span className="text-gray-500 text-sm w-10">Max:</span>
                    <input
                      type="number"
                      className="w-full outline-none text-sm"
                      placeholder="1000"
                      min="0"
                      onChange={(e) => {
                        const minPrice = selectedFilters.priceRange ? 
                          selectedFilters.priceRange[0] : 0;
                        const maxPrice = parseFloat(e.target.value) || 1000;
                        
                        onRangeFilterChange && onRangeFilterChange(
                          'priceRange', 
                          [minPrice, maxPrice] as [number, number]
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {(activeTab === "all" || activeTab === "drinking") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drinking Window Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Drinking Window
                {selectedFilters.drinkingWindow.length > 0 && (
                  <Badge variant="outline" className="ml-auto">{selectedFilters.drinkingWindow.length}</Badge>
                )}
              </h3>
              <div className="space-y-2">
                {['drink_now', 'drink_later', 'custom'].map(status => (
                  <div key={status} className="flex items-center">
                    <Checkbox 
                      id={`status-${status}`}
                      checked={selectedFilters.drinkingWindow.includes(status)}
                      onCheckedChange={(checked) => {
                        onFilterChange('drinkingWindow', status, checked === true);
                      }}
                      className="text-burgundy-600 border-cream-300"
                    />
                    <label 
                      htmlFor={`status-${status}`}
                      className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {getDrinkingWindowName(status)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Custom Date Range Filter */}
            <div className="bg-cream-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-burgundy-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-burgundy-600 inline-block"></span>
                Drinking Date Range
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center bg-white rounded-md border border-cream-300 p-2">
                    <span className="text-gray-500 text-sm w-12">From:</span>
                    <input
                      type="date"
                      className="w-full outline-none text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          const fromDate = new Date(e.target.value);
                          const toDate = selectedFilters.drinkingWindowRange ? 
                            selectedFilters.drinkingWindowRange[1] : 
                            new Date();
                          
                          onRangeFilterChange && onRangeFilterChange(
                            'drinkingWindowRange', 
                            [fromDate, toDate] as [Date, Date]
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center bg-white rounded-md border border-cream-300 p-2">
                    <span className="text-gray-500 text-sm w-12">To:</span>
                    <input
                      type="date"
                      className="w-full outline-none text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          const fromDate = selectedFilters.drinkingWindowRange ? 
                            selectedFilters.drinkingWindowRange[0] : 
                            new Date(2000, 0, 1);
                          const toDate = new Date(e.target.value);
                          
                          onRangeFilterChange && onRangeFilterChange(
                            'drinkingWindowRange', 
                            [fromDate, toDate] as [Date, Date]
                          );
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end mt-6 pt-4 border-t border-cream-200">
          <Button 
            variant="outline" 
            className="mr-2" 
            onClick={() => {
              // Clear all filters and trigger search
              onFilterChange('type', '', false);
              onFilterChange('region', '', false);
              onFilterChange('vintage', 0, false);
              onFilterChange('drinkingWindow', '', false);
              if (onRangeFilterChange) {
                onRangeFilterChange('priceRange', [0, 1000] as [number, number]);
                const today = new Date();
                const pastDate = new Date(2000, 0, 1);
                onRangeFilterChange('purchaseDateRange', [pastDate, today] as [Date, Date]);
              }
            }}
          >
            Clear Filters
          </Button>
          <Button 
            className="bg-burgundy-600 hover:bg-burgundy-700" 
            onClick={() => {
              setIsOpen(false);
              // The filters are already applied as they're changed
            }}
          >
            Apply Filters
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
