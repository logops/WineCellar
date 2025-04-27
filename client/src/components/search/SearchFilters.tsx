import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SearchFiltersProps {
  types: string[];
  regions: string[];
  vintages: number[];
  selectedFilters: {
    type: string[];
    region: string[];
    vintage: number[];
    drinkingWindow: string[];
  };
  onFilterChange: (filterType: string, value: string | number, isSelected: boolean) => void;
}

export default function SearchFilters({
  types,
  regions,
  vintages,
  selectedFilters,
  onFilterChange
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

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-md overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full flex justify-between items-center p-4 h-auto"
        >
          <span className="font-medium">Advanced Filters</span>
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Wine Type Filter */}
          <div>
            <h3 className="font-semibold mb-2 text-burgundy-700">Wine Type</h3>
            <div className="space-y-2">
              {types.map(type => (
                <div key={type} className="flex items-center">
                  <Checkbox 
                    id={`type-${type}`}
                    checked={selectedFilters.type.includes(type)}
                    onCheckedChange={(checked) => {
                      onFilterChange('type', type, checked === true);
                    }}
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
          <div>
            <h3 className="font-semibold mb-2 text-burgundy-700">Region</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {regions.map(region => (
                <div key={region} className="flex items-center">
                  <Checkbox 
                    id={`region-${region}`}
                    checked={selectedFilters.region.includes(region)}
                    onCheckedChange={(checked) => {
                      onFilterChange('region', region, checked === true);
                    }}
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
          <div>
            <h3 className="font-semibold mb-2 text-burgundy-700">Vintage</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sortedVintages.map(vintage => (
                <div key={vintage} className="flex items-center">
                  <Checkbox 
                    id={`vintage-${vintage}`}
                    checked={selectedFilters.vintage.includes(vintage)}
                    onCheckedChange={(checked) => {
                      onFilterChange('vintage', vintage, checked === true);
                    }}
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
          
          {/* Drinking Window Filter */}
          <div>
            <h3 className="font-semibold mb-2 text-burgundy-700">Drinking Window</h3>
            <div className="space-y-2">
              {['drink_now', 'drink_later', 'custom'].map(status => (
                <div key={status} className="flex items-center">
                  <Checkbox 
                    id={`status-${status}`}
                    checked={selectedFilters.drinkingWindow.includes(status)}
                    onCheckedChange={(checked) => {
                      onFilterChange('drinkingWindow', status, checked === true);
                    }}
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
