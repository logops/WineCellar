import { Wine } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import WineGlassIcon from "./WineGlassIcon";
import { formatPrice } from "@/lib/utils";

// Inline function for drinking window display
const parseDrinkingWindow = (wine: any): string => {
  const start = wine.drinkingWindowStart ? new Date(wine.drinkingWindowStart) : null;
  const end = wine.drinkingWindowEnd ? new Date(wine.drinkingWindowEnd) : null;
  
  if (!start && !end) return "Not specified";
  
  const formatYear = (date: Date) => date.getFullYear().toString();
  const startYear = start ? formatYear(start) : '';
  const endYear = end ? formatYear(end) : '';
  
  if (start && end) {
    return `${startYear} - ${endYear}`;
  } else if (start) {
    return `From ${startYear}`;
  } else if (end) {
    return `Until ${endYear}`;
  }
  
  return "Not specified";
};

interface WineMatchCardProps {
  wine: Wine;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export default function WineMatchCard({ wine, isSelected, onToggleSelect }: WineMatchCardProps) {
  return (
    <div 
      className={`border rounded-md p-4 transition-colors duration-200 
        ${isSelected ? 'border-burgundy-400 bg-burgundy-50' : 'border-gray-200 hover:border-burgundy-200'}`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={() => onToggleSelect()}
            className="data-[state=checked]:bg-burgundy-600 data-[state=checked]:border-burgundy-600"
          />
        </div>
        
        <div className="flex flex-1 gap-4">
          <div className="flex-shrink-0">
            <WineGlassIcon type={wine.type} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-serif text-base text-gray-800">
              {wine.vintage && <span>{wine.vintage} </span>}
              {wine.producer}{" "}
              {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard} </span>}
              {wine.name || (wine.grapeVarieties && wine.grapeVarieties.split(",")[0].trim())}
            </h3>
            
            <div className="mt-1 text-sm text-gray-500">
              {wine.grapeVarieties && <span>{wine.grapeVarieties} · </span>}
              {wine.region && <span className="font-medium">{wine.region}</span>}
              {wine.subregion && <span className="text-gray-400 ml-1">({wine.subregion})</span>}
            </div>
            
            <div className="flex flex-wrap mt-2 gap-x-4 gap-y-1 text-xs text-gray-500">
              <div>
                {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} · {wine.bottleSize}
              </div>
              
              {wine.drinkingWindowStart && wine.drinkingWindowEnd && (
                <div>
                  Drinking Window: {parseDrinkingWindow(wine)}
                </div>
              )}
              
              {wine.currentValue && (
                <div>
                  Value: {formatPrice(wine.currentValue)}
                </div>
              )}
              
              {wine.storageLocation && (
                <div>
                  Location: {wine.storageLocation}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}