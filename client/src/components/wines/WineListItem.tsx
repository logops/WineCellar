import { useState } from "react";
import { Wine } from "@shared/schema";
import WineGlassIcon from "./WineGlassIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import AddWineForm from "../forms/AddWineForm";
import { formatPrice } from "@/lib/utils";
import { parseDrinkingWindow } from "@/lib/date-utils";
import { Edit, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WineListItemProps {
  wine: Wine;
  onUpdate?: () => void;
}

export default function WineListItem({ wine, onUpdate }: WineListItemProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  
  // Close handler for the edit dialog
  const handleCloseDialog = () => {
    console.log("Form dirty state:", formIsDirty);
    
    if (formIsDirty) {
      setShowUnsavedChangesDialog(true);
    } else {
      setShowEditModal(false);
      if (onUpdate) onUpdate();
    }
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="border border-gray-200 rounded-md shadow-sm hover:shadow-md hover:border-burgundy-200 transition-all duration-200 relative group">
          {/* Compact header - always visible */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center flex-grow cursor-pointer" onClick={() => setShowEditModal(true)}>
              <div className="w-8 h-8 flex-shrink-0 mr-3">
                <WineGlassIcon type={wine.type} />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="font-serif text-base text-gray-800 font-medium truncate">
                  {wine.vintage && <span>{wine.vintage} </span>}
                  {wine.producer}{" "}
                  {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard} </span>}
                  {wine.name ? wine.name : wine.grapeVarieties ? wine.grapeVarieties.split(",")[0].trim() : ''}
                </h3>
                <p className="text-gray-500 text-xs truncate">
                  {wine.grapeVarieties && <span className="mr-1">{wine.grapeVarieties}</span>}
                  {wine.region && <span className="font-medium">{wine.region}</span>}
                  {wine.subregion && <span className="text-gray-400 ml-1">({wine.subregion})</span>}
                </p>
              </div>
            </div>
            
            {/* Quick info and expand button */}
            <div className="flex items-center space-x-3">
              <div className="text-xs text-gray-500 hidden sm:block">
                {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-burgundy-600 font-medium hidden md:block">
                {wine.drinkingStatus === "drink_now" 
                  ? "Drink Now" 
                  : wine.drinkingStatus === "drink_later" 
                    ? "Drink Later" 
                    : parseDrinkingWindow(wine)}
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Expandable details */}
          <CollapsibleContent>
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="mt-3 text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-gray-500">Drinking Window</div>
                  <div className="flex items-center">
                    <span className="text-burgundy-600 font-medium mr-3">
                      {wine.drinkingStatus === "drink_now" 
                        ? "Drink Now" 
                        : wine.drinkingStatus === "drink_later" 
                          ? "Drink Later" 
                          : parseDrinkingWindow(wine)}
                    </span>
                    <div className="w-16 h-1 bg-burgundy-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-gray-500">
                    {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} · {wine.bottleSize}
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">Value:</span>
                    <span className="text-burgundy-600 font-medium">{formatPrice(wine.currentValue)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <div>Storage Location</div>
                  <div>{wine.storageLocation || 'Main Cellar'}</div>
                </div>
                {wine.rating && (
                  <div className="flex items-center justify-between text-gray-500">
                    <div>Rating</div>
                    <div>{wine.rating}/100</div>
                  </div>
                )}
                {wine.notes && (
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <div className="text-gray-500 mb-2">Notes</div>
                    <div className="text-gray-600 text-sm italic">{wine.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      {showUnsavedChangesDialog && (
        <div id="force-render-dialog">
          <AlertDialog 
            open={showUnsavedChangesDialog} 
            onOpenChange={setShowUnsavedChangesDialog}
          >
            <AlertDialogContent className="bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-burgundy-700">Unsaved Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes to this wine. Are you sure you want to close without saving?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-cream-100 text-burgundy-700 border-cream-300 hover:bg-cream-200">
                  Cancel
                </AlertDialogCancel>
                <Button 
                  type="button"
                  className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
                  onClick={() => {
                    console.log("Discard button clicked - closing all dialogs first");
                    
                    // Set closing order with timeouts
                    setShowUnsavedChangesDialog(false);
                    
                    setTimeout(() => {
                      setShowEditModal(false);
                      setFormIsDirty(false);
                      
                      if (onUpdate) {
                        setTimeout(() => {
                          onUpdate();
                        }, 50);
                      }
                    }, 50);
                  }}
                >
                  Discard Changes
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Edit Wine Dialog */}
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
          onInteractOutside={(e) => {
            console.log("Interaction outside dialog detected");
            // Prevent event from continuing to propagate
            e.preventDefault();
            
            // If form is dirty, show the confirmation dialog
            if (formIsDirty) {
              console.log("Form is dirty, showing confirmation dialog");
              setShowUnsavedChangesDialog(true);
            } else {
              // Only if not dirty, close the dialog
              console.log("Form is clean, closing directly");
              setShowEditModal(false);
              if (onUpdate) onUpdate();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Handle ESC key the same way as clicking X
            if (formIsDirty) {
              e.preventDefault();
              setShowUnsavedChangesDialog(true);
            }
          }}
        >
          <div className="flex justify-between items-center">
            <DialogHeader>
              <DialogTitle>
                Edit {wine.vintage && `${wine.vintage} `}{wine.producer} {wine.vineyard && `${wine.vineyard} `}
                {wine.name ? wine.name : wine.grapeVarieties ? wine.grapeVarieties.split(",")[0].trim() : ''}
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-sm mt-1">
                Edit details of this wine and save changes to update your collection
              </DialogDescription>
            </DialogHeader>
            
            {/* Use a regular button for more reliable behavior */}
            <Button
              type="button"
              className="rounded-sm opacity-70 ring-offset-background
                transition-opacity hover:opacity-100 focus:outline-none
                focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                console.log("X button clicked, handling close");
                
                if (formIsDirty) {
                  // If form is dirty, show confirmation dialog
                  setShowUnsavedChangesDialog(true);
                } else {
                  // If form is not dirty, close immediately
                  setShowEditModal(false);
                  if (onUpdate) onUpdate();
                }
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <div className="p-1">
            <AddWineForm 
              wine={wine} 
              onSuccess={() => {
                setShowEditModal(false);
                if (onUpdate) onUpdate();
              }}
              onFormChange={(isDirty) => setFormIsDirty(isDirty)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
