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
import { formatPrice, parseDrinkingWindow } from "@/lib/utils";
import { Edit, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WineListItemProps {
  wine: Wine;
  onUpdate?: () => void;
}

export default function WineListItem({ wine, onUpdate }: WineListItemProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Simple function to handle card click
  const handleCardClick = () => {
    setShowEditModal(true);
    // Form dirty state will be managed by the form component
  };

  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  
  // Close handler for the edit dialog
  const handleCloseDialog = () => {
    // Log the form state to help with debugging
    console.log("Form dirty state:", formIsDirty);
    
    if (formIsDirty) {
      // Show styled dialog instead of browser confirm
      setShowUnsavedChangesDialog(true);
    } else {
      // No changes made, close dialog directly
      setShowEditModal(false);
      if (onUpdate) onUpdate(); // Refresh the wine list when closing
    }
  };
  
  // Let's simplify this completely - we don't need this function anymore
  // Each component will handle its own state directly

  return (
    <div 
      className="border border-gray-200 rounded-md p-6 shadow-sm hover:shadow-md hover:border-burgundy-200 hover:bg-cream-50 transition-all duration-200 cursor-pointer relative group"
      onClick={handleCardClick}
    >
      <div className="absolute top-3 right-3 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Edit className="h-4 w-4 text-gray-500" />
      </div>
      <div className="flex">
        <div className="w-12 flex-shrink-0 mr-5">
          <WineGlassIcon type={wine.type} />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="font-serif text-lg text-gray-800 font-medium">
                {wine.vintage && <span>{wine.vintage} </span>}
                {wine.producer}{" "}
                {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard} </span>}
                {wine.name ? wine.name : wine.grapeVarieties && wine.grapeVarieties.split(",")[0].trim()}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {wine.grapeVarieties && <span className="mr-1">{wine.grapeVarieties}</span>}
                {wine.region && <span className="font-medium">{wine.region}</span>}
                {wine.subregion && <span className="text-gray-400 ml-1">({wine.subregion})</span>}
              </p>
              {wine.rating && <p className="text-xs text-gray-400 mt-1">Rating: {wine.rating}/100</p>}
            </div>
          </div>
          
          <div className="mt-5 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-gray-500">Drinking Window</div>
              <div className="flex items-center">
                <span className="text-burgundy-600 font-medium mr-3">
                  {wine.drinkingStatus === "drink_now" 
                    ? "Drink Now" 
                    : wine.drinkingStatus === "drink_later" 
                      ? "Drink Later" 
                      : parseDrinkingWindow(wine.drinkingWindowStart, wine.drinkingWindowEnd)}
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
              <div>Main Cellar</div>
            </div>
            {wine.notes && (
              <div className="pt-3 mt-3 border-t border-gray-100">
                <div 
                  className="flex items-center justify-between cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening edit dialog
                    setNotesExpanded(!notesExpanded);
                  }}
                >
                  <div className="text-gray-500 mb-1">Notes</div>
                  <div className="text-gray-400">
                    {notesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {notesExpanded ? (
                  <div className="text-gray-600 text-sm italic">{wine.notes}</div>
                ) : (
                  <div className="text-gray-600 text-sm italic line-clamp-1">{wine.notes}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import the new ConfirmDialog component */}
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
                {wine.name ? wine.name : wine.grapeVarieties && wine.grapeVarieties.split(",")[0].trim()}
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
    </div>
  );
}
