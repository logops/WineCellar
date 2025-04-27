import { useState } from "react";
import { Wine } from "@shared/schema";
import WineGlassIcon from "./WineGlassIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "../forms/AddWineForm";
import { formatPrice, parseDrinkingWindow } from "@/lib/utils";
import { Camera } from "lucide-react";

interface WineListItemProps {
  wine: Wine;
  onUpdate?: () => void;
}

export default function WineListItem({ wine, onUpdate }: WineListItemProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="border border-cream-300 rounded-xl p-5 shadow-sm hover:shadow-md hover:bg-cream-50 transition-all duration-200">
      <div className="flex">
        <div className="w-10 flex-shrink-0 mr-4">
          <WineGlassIcon type={wine.type} />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="font-semibold text-burgundy-700">
                {wine.producer} {wine.vintage && <span className="font-spectral">{wine.vintage}</span>} {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard}</span>} {wine.name}
              </h3>
              <p className="text-gray-600 text-sm font-medium">
                {wine.grapeVarieties && <span className="mr-1">{wine.grapeVarieties}</span>}
                {wine.region && <span>{wine.region}</span>}
                {wine.subregion && <span className="text-gray-500 ml-1">({wine.subregion})</span>}
              </p>
              {wine.rating && <p className="text-xs text-gray-500 mt-1">Rating: CT{wine.rating}</p>}
            </div>
            <div className="mt-2 md:mt-0 flex">
              <button 
                className="flex items-center text-burgundy-600 text-xs rounded-full hover:bg-burgundy-100 p-2 transition-colors"
                onClick={() => setShowEditModal(true)}
                aria-label="Edit wine"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-sm space-y-2">
            <div className="flex items-center">
              <div className="w-40 flex-shrink-0 text-gray-700 font-medium">Drinking Window</div>
              <div className="ml-2 flex items-center">
                <span className="text-burgundy-700 font-medium">
                  {wine.drinkingStatus === "drink_now" 
                    ? "Drink Now" 
                    : wine.drinkingStatus === "drink_later" 
                      ? "Drink Later" 
                      : parseDrinkingWindow(wine.drinkingWindowStart, wine.drinkingWindowEnd)}
                </span>
                <div className="ml-2 w-20 h-1 bg-burgundy-600 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-40 flex-shrink-0 text-gray-700 font-medium">
                {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} ({wine.bottleSize})
              </div>
              <div className="ml-2 flex items-center">
                <span className="text-gray-700">Value:</span>
                <span className="ml-1 text-burgundy-700 font-semibold">{formatPrice(wine.currentValue)}</span>
              </div>
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-40 flex-shrink-0 font-medium">Storage Location</div>
              <div className="ml-2">Cellar ({wine.quantity})</div>
            </div>
            {wine.notes && (
              <div className="pt-2 mt-2 border-t border-cream-200">
                <div className="text-gray-700 font-medium mb-1">Notes</div>
                <div className="text-gray-600 italic">{wine.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Wine Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Wine</DialogTitle>
          </DialogHeader>
          <AddWineForm 
            wine={wine} 
            onSuccess={() => {
              setShowEditModal(false);
              if (onUpdate) onUpdate();
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
