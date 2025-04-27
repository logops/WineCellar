import { useState } from "react";
import { Wine } from "@shared/schema";
import WineGlassIcon from "../wines/WineGlassIcon";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConsumeWineForm from "@/components/forms/ConsumeWineForm";

interface ReadyToDrinkListProps {
  wines: Wine[];
}

export default function ReadyToDrinkList({ wines }: ReadyToDrinkListProps) {
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  
  // Filter for wines that are ready to drink
  const readyToDrinkWines = wines.filter(wine => {
    // If status is drink_now, it's ready
    if (wine.drinkingStatus === 'drink_now') return true;
    
    // Check if current date is within the drinking window
    const now = new Date();
    const startDate = wine.drinkingWindowStart ? new Date(wine.drinkingWindowStart) : null;
    
    return startDate && startDate <= now;
  });

  if (readyToDrinkWines.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No wines are currently ready to drink</p>
        <p className="text-sm text-gray-600">Add more wines or update drinking windows to see wines here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">{readyToDrinkWines.length} wines are ready to drink</p>
        <Button onClick={() => setShowConsumeModal(true)}>
          Consume a Wine
        </Button>
      </div>
      
      <div className="space-y-4">
        {readyToDrinkWines.map(wine => (
          <div key={wine.id} className="border rounded-md p-4 hover:bg-cream-50">
            <div className="flex">
              <div className="w-8 flex-shrink-0 mr-3">
                <WineGlassIcon type={wine.type} />
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-burgundy-700">
                  {wine.vintage} {wine.producer} {wine.name}
                </h3>
                <p className="text-gray-600 text-sm">{wine.region}</p>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Drinking Window:</span>
                    <span className="font-medium">
                      {wine.drinkingStatus === 'drink_now' 
                        ? 'Drink Now' 
                        : wine.drinkingWindowStart 
                          ? `${formatDate(wine.drinkingWindowStart, 'yyyy')} - ${wine.drinkingWindowEnd ? formatDate(wine.drinkingWindowEnd, 'yyyy') : 'Future'}`
                          : 'Not specified'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Quantity:</span>
                    <span className="font-medium">{wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Value:</span>
                    <span className="font-medium">{formatPrice(wine.currentValue)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-gray-600 w-32">Bottle Size:</span>
                    <span className="font-medium">{wine.bottleSize}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Consume Wine Dialog */}
      <Dialog open={showConsumeModal} onOpenChange={setShowConsumeModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Drink or Remove Wine</DialogTitle>
          </DialogHeader>
          <ConsumeWineForm onSuccess={() => setShowConsumeModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
