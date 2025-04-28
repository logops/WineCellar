import { useState } from "react";
import { Wine } from "@shared/schema";
import WineGlassIcon from "./WineGlassIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "../forms/AddWineForm";
import { formatPrice, parseDrinkingWindow } from "@/lib/utils";
import { Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WineListItemProps {
  wine: Wine;
  onUpdate?: () => void;
}

export default function WineListItem({ wine, onUpdate }: WineListItemProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);

  // Simple function to handle card click
  const handleCardClick = () => {
    setShowEditModal(true);
    setFormIsDirty(false); // Reset dirty state when opening
  };

  // Close handler for the edit dialog
  const handleCloseDialog = () => {
    if (formIsDirty) {
      // Show simple browser confirmation dialog
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close without saving?"
      );
      
      if (confirmed) {
        setShowEditModal(false);
        if (onUpdate) onUpdate();
      }
    } else {
      // No changes made, close dialog
      setShowEditModal(false);
    }
  };

  return (
    <div 
      className="border border-cream-300 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-burgundy-300 hover:bg-cream-50 transition-all duration-200 cursor-pointer relative group"
      onClick={handleCardClick}
    >
      <div className="absolute top-2 right-2 bg-burgundy-100 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Edit className="h-3 w-3 text-burgundy-700" />
      </div>
      <div className="flex">
        <div className="w-10 flex-shrink-0 mr-4">
          <WineGlassIcon type={wine.type} />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="font-semibold text-burgundy-700">
                {wine.vintage && <span className="font-spectral">{wine.vintage} </span>}
                {wine.producer}{" "}
                {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard} </span>}
                {wine.name ? wine.name : wine.grapeVarieties && wine.grapeVarieties.split(",")[0].trim()}
              </h3>
              <p className="text-gray-600 text-sm font-medium">
                {wine.grapeVarieties && <span className="mr-1">{wine.grapeVarieties}</span>}
                {wine.region && <span>{wine.region}</span>}
                {wine.subregion && <span className="text-gray-500 ml-1">({wine.subregion})</span>}
              </p>
              {wine.rating && <p className="text-xs text-gray-500 mt-1">Rating: CT{wine.rating}</p>}
            </div>
          </div>
          
          <div className="mt-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-gray-700 font-medium">Drinking Window</div>
              <div className="flex items-center">
                <span className="text-burgundy-700 font-medium mr-3">
                  {wine.drinkingStatus === "drink_now" 
                    ? "Drink Now" 
                    : wine.drinkingStatus === "drink_later" 
                      ? "Drink Later" 
                      : parseDrinkingWindow(wine.drinkingWindowStart, wine.drinkingWindowEnd)}
                </span>
                <div className="w-16 h-1 bg-burgundy-600 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-gray-700 font-medium">
                {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} ({wine.bottleSize})
              </div>
              <div className="flex items-center">
                <span className="text-gray-700 mr-1">Value:</span>
                <span className="text-burgundy-700 font-semibold">{formatPrice(wine.currentValue)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <div className="font-medium">Storage Location</div>
              <div>Cellar ({wine.quantity})</div>
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

      {/* Edit Wine Dialog - Using simple browser confirm dialog for unsaved changes */}
      {showEditModal && (
        <Dialog 
          open={showEditModal} 
          onOpenChange={(open) => {
            if (!open) {
              handleCloseDialog();
            }
          }}
        >
          <DialogContent
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <Button 
              type="button"
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background 
                transition-opacity hover:opacity-100 focus:outline-none 
                focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              onClick={handleCloseDialog}
              variant="ghost"
              size="icon"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            
            <DialogHeader>
              <DialogTitle>
                Edit {wine.vintage && `${wine.vintage} `}{wine.producer} {wine.vineyard && `${wine.vineyard} `}
                {wine.name ? wine.name : wine.grapeVarieties && wine.grapeVarieties.split(",")[0].trim()}
              </DialogTitle>
              <p className="text-gray-500 text-sm mt-1">
                Edit details of this wine and save changes to update your collection
              </p>
            </DialogHeader>
            <div className="p-1">
              <AddWineForm 
                wine={wine} 
                onSuccess={() => {
                  setShowEditModal(false);
                  if (onUpdate) onUpdate();
                }}
                hideCloseButton={true}
                onFormChange={(isDirty) => setFormIsDirty(isDirty)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
