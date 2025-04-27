import { useState } from "react";
import { Wine } from "@shared/schema";
import WineGlassIcon from "./WineGlassIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "../forms/AddWineForm";
import { formatPrice } from "@/lib/utils";
import { Camera } from "lucide-react";

interface WineListItemProps {
  wine: Wine;
  onUpdate?: () => void;
}

export default function WineListItem({ wine, onUpdate }: WineListItemProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="border rounded-md p-4 hover:bg-cream-50">
      <div className="flex">
        <div className="w-8 flex-shrink-0 mr-3">
          <WineGlassIcon type={wine.type} />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="font-medium text-burgundy-700">
                {wine.vintage} {wine.producer} {wine.name}
              </h3>
              <p className="text-gray-600 text-sm">{wine.region}</p>
              <p className="text-xs text-gray-500">CT{wine.rating}</p>
            </div>
            <div className="mt-2 md:mt-0 flex">
              <button 
                className="flex items-center text-burgundy-600 text-xs mr-3"
                onClick={() => setShowEditModal(true)}
                aria-label="Edit wine"
              >
                <Camera className="h-4 w-4 mr-1" />
              </button>
            </div>
          </div>
          
          <div className="mt-3 text-sm">
            <div className="flex items-center mb-1">
              <div className="w-32 flex-shrink-0">Show Drinking Window</div>
              <div className="ml-3 w-6 h-1 bg-burgundy-600 rounded-full"></div>
            </div>
            <div className="flex items-center mb-1">
              <div className="w-32 flex-shrink-0">{wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} ({wine.bottleSize})</div>
              <div className="ml-3">—</div>
              <div className="ml-2 flex items-center">
                <span className="text-gray-700">V</span>
                <span className="ml-1 text-burgundy-700 font-medium">{formatPrice(wine.currentValue)}</span>
              </div>
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-32 flex-shrink-0">Cellar</div>
              <div className="ml-3">({wine.quantity})</div>
            </div>
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
