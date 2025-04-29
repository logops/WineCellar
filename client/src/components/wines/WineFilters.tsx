import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, Filter } from "lucide-react";

interface WineFiltersProps {
  onFilterChange: (filters: any) => void;
  totalCount: number;
  regionCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  vintageCounts: Record<string, number>;
  isOpen: boolean;
  onToggle: () => void;
}

export function WineFilters({ 
  onFilterChange, 
  totalCount, 
  regionCounts, 
  typeCounts, 
  vintageCounts,
  isOpen,
  onToggle
}: WineFiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<{
    regions: string[];
    types: string[];
    vintages: string[];
    priceRange: [number, number];
    ratingRange: [number, number];
  }>({
    regions: [],
    types: [],
    vintages: [],
    priceRange: [0, 500],
    ratingRange: [80, 100]
  });
  
  const handleFilterToggle = (category: 'regions' | 'types' | 'vintages', value: string) => {
    setSelectedFilters(prev => {
      const newFilters = {...prev};
      if (newFilters[category].includes(value)) {
        newFilters[category] = newFilters[category].filter(v => v !== value);
      } else {
        newFilters[category] = [...newFilters[category], value];
      }
      return newFilters;
    });
  };
  
  const handlePriceChange = (value: number[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      priceRange: [value[0], value[1]] as [number, number]
    }));
  };
  
  const handleRatingChange = (value: number[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      ratingRange: [value[0], value[1]] as [number, number]
    }));
  };
  
  const clearAllFilters = () => {
    setSelectedFilters({
      regions: [],
      types: [],
      vintages: [],
      priceRange: [0, 500],
      ratingRange: [80, 100]
    });
  };
  
  // Apply filters when they change
  // useEffect(() => {
  //   onFilterChange(selectedFilters);
  // }, [selectedFilters, onFilterChange]);

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-white shadow-md border-r-0 rounded-l-md rounded-r-none pl-2 pr-1 py-6"
        onClick={onToggle}
      >
        <Filter size={18} />
      </Button>
    );
  }
  
  return (
    <div className="w-64 bg-white shadow-md rounded-r-md border border-gray-200 h-[calc(100vh-7rem)] fixed left-0 top-28 z-10">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-medium text-gray-800">Filters</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs text-gray-600">
            Clear All
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggle} className="h-7 w-7 p-0">
            <X size={16} />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100%-3.5rem)] py-2 px-4">
        <div className="space-y-6 pb-4">
          {/* Wine Types */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Wine Type</h4>
            <div className="space-y-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`type-${type}`} 
                    checked={selectedFilters.types.includes(type)}
                    onCheckedChange={() => handleFilterToggle('types', type)}
                  />
                  <Label 
                    htmlFor={`type-${type}`} 
                    className="text-sm font-normal cursor-pointer flex justify-between w-full"
                  >
                    <span>{type}</span>
                    <span className="text-gray-500 text-xs">{count}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Regions */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Region</h4>
            <div className="space-y-2">
              {Object.entries(regionCounts).slice(0, 6).map(([region, count]) => (
                <div key={region} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`region-${region}`} 
                    checked={selectedFilters.regions.includes(region)}
                    onCheckedChange={() => handleFilterToggle('regions', region)}
                  />
                  <Label 
                    htmlFor={`region-${region}`} 
                    className="text-sm font-normal cursor-pointer flex justify-between w-full"
                  >
                    <span>{region}</span>
                    <span className="text-gray-500 text-xs">{count}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Vintage */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Vintage</h4>
            <div className="space-y-2">
              {Object.entries(vintageCounts).slice(0, 5).map(([vintage, count]) => (
                <div key={vintage} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`vintage-${vintage}`} 
                    checked={selectedFilters.vintages.includes(vintage)}
                    onCheckedChange={() => handleFilterToggle('vintages', vintage)}
                  />
                  <Label 
                    htmlFor={`vintage-${vintage}`} 
                    className="text-sm font-normal cursor-pointer flex justify-between w-full"
                  >
                    <span>{vintage}</span>
                    <span className="text-gray-500 text-xs">{count}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Price Range */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Price Range</h4>
            <div className="px-2">
              <Slider
                defaultValue={[0, 500]}
                max={500}
                step={10}
                value={[selectedFilters.priceRange[0], selectedFilters.priceRange[1]]}
                onValueChange={handlePriceChange}
                className="mb-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>${selectedFilters.priceRange[0]}</span>
                <span>${selectedFilters.priceRange[1]}+</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Rating Range */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Rating</h4>
            <div className="px-2">
              <Slider
                defaultValue={[80, 100]}
                min={50}
                max={100}
                step={1}
                value={[selectedFilters.ratingRange[0], selectedFilters.ratingRange[1]]}
                onValueChange={handleRatingChange}
                className="mb-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{selectedFilters.ratingRange[0]}</span>
                <span>{selectedFilters.ratingRange[1]}</span>
              </div>
            </div>
          </div>
          
          {/* Active Filters */}
          {(selectedFilters.regions.length > 0 || 
            selectedFilters.types.length > 0 || 
            selectedFilters.vintages.length > 0) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-700">Active Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFilters.regions.map(region => (
                    <Badge key={region} variant="outline" className="bg-cream-50 text-xs py-0 h-6">
                      {region}
                      <button 
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        onClick={() => handleFilterToggle('regions', region)}
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                  {selectedFilters.types.map(type => (
                    <Badge key={type} variant="outline" className="bg-cream-50 text-xs py-0 h-6">
                      {type}
                      <button 
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        onClick={() => handleFilterToggle('types', type)}
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                  {selectedFilters.vintages.map(vintage => (
                    <Badge key={vintage} variant="outline" className="bg-cream-50 text-xs py-0 h-6">
                      {vintage}
                      <button 
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        onClick={() => handleFilterToggle('vintages', vintage)}
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}