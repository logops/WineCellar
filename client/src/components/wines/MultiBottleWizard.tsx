import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wine, ChevronRight, SkipForward, Pencil, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WineBottleData {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  grapeVarieties: string | null;
  type: string | null;
  alcoholContent: number | null;
  confidence: number;
  isReadable?: boolean;
  bottlePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  notes?: string;
  recommendedDrinkingWindow?: {
    startYear: number;
    endYear: number;
    isPastPrime: boolean;
    notes: string;
  };
}

interface MultiBottleData {
  bottles: WineBottleData[];
}

interface MultiBottleWizardProps {
  bottleData: MultiBottleData;
  onComplete: () => void;
  onCancel: () => void;
  onProcessBottle: (bottle: WineBottleData, index: number, total: number, addToCollection?: boolean) => void;
  onEnhanceWithAI?: (bottle: WineBottleData) => void;
  isEnhancingWithAI?: boolean;
  existingWines?: any[];
}

export function MultiBottleWizard({ 
  bottleData, 
  onComplete, 
  onCancel, 
  onProcessBottle,
  onEnhanceWithAI,
  isEnhancingWithAI = false,
  existingWines = []
}: MultiBottleWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedBottles, setSkippedBottles] = useState<number[]>([]);
  const [processedBottles, setProcessedBottles] = useState<number[]>([]);
  const [bottlesToAdd, setBottlesToAdd] = useState<number[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBottle, setEditedBottle] = useState<WineBottleData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  const { toast } = useToast();

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!bottleData || !bottleData.bottles.length) return 0;
    return ((currentIndex + 1) / bottleData.bottles.length) * 100;
  };

  // Get current bottle data
  const currentBottle = bottleData.bottles[currentIndex];
  
  // Initialize editedBottle whenever currentIndex changes
  useEffect(() => {
    if (currentBottle) {
      setEditedBottle({...currentBottle});
      setIsEditMode(false);
    }
  }, [currentIndex, currentBottle]);

  // Get the bottle data to display (either the original or edited version)
  const displayBottle = isEditMode ? editedBottle : currentBottle;

  // Check if the current bottle is a duplicate
  const isDuplicate = existingWines.some(existingWine => 
    existingWine.producer === displayBottle?.producer &&
    existingWine.name === displayBottle?.name &&
    existingWine.vintage === displayBottle?.vintage
  );

  // Handle initiating the bottle processing flow
  const handleProcessBottle = () => {
    // Check if we have edits and are in edit mode and need confirmation
    if (isEditMode && hasEdits) {
      // Open the confirmation dialog instead of processing immediately
      setShowConfirmDialog(true);
      return;
    }
    
    // If no confirmation needed, process the bottle directly
    processBottleWithEdits();
  };
  
  // Function to actually process the bottle after any confirmations
  const processBottleWithEdits = () => {
    // Add this bottle to processed list and mark it for addition
    setProcessedBottles(prev => [...prev, currentIndex]);
    setBottlesToAdd(prev => [...prev, currentIndex]);
    
    // Use the edited bottle data if in edit mode, otherwise use the original
    const bottleToProcess = isEditMode && editedBottle ? editedBottle : currentBottle;
    
    // If we're in edit mode, update the original data in the bottleData array to preserve edits
    if (isEditMode && editedBottle) {
      // Make a deep copy of the bottles array
      const updatedBottles = [...bottleData.bottles];
      // Update the current bottle with the edited version
      updatedBottles[currentIndex] = editedBottle;
      // Update the bottleData object
      bottleData.bottles = updatedBottles;
    }
    
    // Instead of adding to collection immediately, just save the data for batch processing
    // Set the flag to false to indicate we're just collecting data, not adding yet
    onProcessBottle(bottleToProcess, currentIndex + 1, bottleData.bottles.length, false);
    
    // Show message that the wine is queued for addition
    toast({
      title: "Wine Queued for Addition",
      description: isDuplicate 
        ? "This wine will be added to your collection with increased quantity."
        : "This wine will be added to your collection.",
    });
    
    // Reset the dialog and edit tracking state
    setShowConfirmDialog(false);
    setHasEdits(false);
    
    // Move to the next bottle
    handleNext();
  };

  // Handle skipping the current bottle
  const handleSkip = () => {
    // Mark this bottle as skipped
    setSkippedBottles(prev => [...prev, currentIndex]);
    
    toast({
      title: "Bottle Skipped",
      description: "Moving to the next bottle."
    });
    
    // Move to the next bottle
    handleNext();
  };

  // Handle moving to the next bottle
  const handleNext = () => {
    const newIndex = currentIndex + 1;
    
    if (newIndex >= bottleData.bottles.length) {
      // We've processed all bottles, now do the batch processing
      const bottlesToAddCount = bottlesToAdd.length;
      const skippedCount = skippedBottles.length;
      const totalCount = bottleData.bottles.length;
      
      // Batch add all the bottles that are queued for addition
      if (bottlesToAddCount > 0) {
        // For each bottle marked to add, process it with addToCollection=true
        bottlesToAdd.forEach(index => {
          // Use the potentially updated bottle data from the bottleData array
          const bottleToProcess = bottleData.bottles[index];
          onProcessBottle(bottleToProcess, index + 1, totalCount, true);
        });
        
        toast({
          title: "Batch Processing Complete",
          description: `Added ${bottlesToAddCount} wine bottle${bottlesToAddCount !== 1 ? 's' : ''} to your collection. ${skippedCount > 0 ? `Skipped ${skippedCount} bottle${skippedCount !== 1 ? 's' : ''}.` : ''}`,
        });
      } else {
        toast({
          title: "Processing Complete",
          description: `No wines were added to the collection. ${skippedCount > 0 ? `Skipped ${skippedCount} bottle${skippedCount !== 1 ? 's' : ''}.` : ''}`,
        });
      }
      
      onComplete();
      return;
    }
    
    setCurrentIndex(newIndex);
    
    // Reset edit mode for the new bottle
    setIsEditMode(false);
    setEditedBottle(null);
  };

  // Handle cancelling the wizard
  const handleCancel = () => {
    if (processedBottles.length > 0) {
      toast({
        title: "Wizard Closed",
        description: `Added ${processedBottles.length} of ${bottleData.bottles.length} bottles to your collection.`,
      });
    }
    
    onCancel();
  };
  
  // Enter edit mode
  const handleEdit = () => {
    setIsEditMode(true);
  };
  
  // Cancel edit mode
  const handleCancelEdit = () => {
    // Reset to original values
    if (currentBottle) {
      setEditedBottle({...currentBottle});
    }
    setIsEditMode(false);
    setHasEdits(false);
  };
  
  // Discard edits and process with original data
  const handleDiscardEdits = () => {
    if (currentBottle) {
      // Reset the edited bottle to match the original
      setEditedBottle({...currentBottle});
      setHasEdits(false);
      setIsEditMode(false);
      
      // Process with the original data
      processBottleWithEdits();
    }
  };
  
  // Update edited bottle field
  const handleFieldChange = (field: keyof WineBottleData, value: any) => {
    if (editedBottle) {
      // Check if the value is actually different from the original 
      const originalValue = currentBottle?.[field];
      const valueHasChanged = originalValue !== value;
      
      // Update the edited bottle data
      setEditedBottle({
        ...editedBottle,
        [field]: value
      });
      
      // If any field is different from the original, mark as having edits
      if (valueHasChanged) {
        setHasEdits(true);
      } else {
        // Check if any other fields still have edits
        const otherFieldsEdited = Object.keys(editedBottle).some(key => {
          if (key === field) return false; // Skip the current field
          const k = key as keyof WineBottleData;
          return currentBottle?.[k] !== editedBottle[k];
        });
        setHasEdits(otherFieldsEdited);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-burgundy-700">
          <Wine className="h-5 w-5" />
          Multiple Bottles Detected
        </CardTitle>
        <CardDescription>
          {`Processing bottle ${currentIndex + 1} of ${bottleData.bottles.length}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Progress value={calculateProgress()} className="w-full mb-2" />
        
        {/* Batch processing status */}
        <div className="mb-4 flex justify-between text-xs text-muted-foreground">
          <span>Queued for addition: {bottlesToAdd.length}</span>
          <span>Skipped: {skippedBottles.length}</span>
        </div>
        
        {displayBottle && (
          <div className="space-y-4 p-4 border rounded-md">
            {!isEditMode ? (
              // View mode - display data
              <>
                <p className="text-sm">
                  <span className="font-semibold">Producer:</span> {displayBottle.producer || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Wine:</span> {displayBottle.name || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Vintage:</span> {displayBottle.vintage || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Region:</span> {displayBottle.region || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Grape Varieties:</span> {displayBottle.grapeVarieties || 'Unknown'}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Type:</span> {displayBottle.type || 'Unknown'}
                </p>
              </>
            ) : (
              // Edit mode - show editable fields
              <>
                <div className="space-y-2">
                  <Label htmlFor="producer">Producer</Label>
                  <Input 
                    id="producer" 
                    value={editedBottle?.producer || ''} 
                    onChange={(e) => handleFieldChange('producer', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Wine Name</Label>
                  <Input 
                    id="name" 
                    value={editedBottle?.name || ''} 
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vintage">Vintage</Label>
                  <Input 
                    id="vintage" 
                    type="number"
                    value={editedBottle?.vintage || ''} 
                    onChange={(e) => handleFieldChange('vintage', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input 
                    id="region" 
                    value={editedBottle?.region || ''} 
                    onChange={(e) => handleFieldChange('region', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="grapeVarieties">Grape Varieties</Label>
                  <Input 
                    id="grapeVarieties" 
                    value={editedBottle?.grapeVarieties || ''} 
                    onChange={(e) => handleFieldChange('grapeVarieties', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Wine Type</Label>
                  <Select 
                    value={editedBottle?.type?.toLowerCase() || 'red'} 
                    onValueChange={(value) => handleFieldChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wine type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="red">Red Wine</SelectItem>
                      <SelectItem value="white">White Wine</SelectItem>
                      <SelectItem value="rose">Rosé</SelectItem>
                      <SelectItem value="sparkling">Sparkling</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {isDuplicate && !isEditMode && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                This wine already exists in your collection. Adding it will increase its quantity.
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {!isEditMode ? (
          // View mode buttons
          <>
            <div className="flex gap-2">
              <Button 
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSkip}
                variant="outline"
                size="sm"
              >
                <SkipForward className="mr-1 h-4 w-4" />
                Skip
              </Button>
              <Button 
                onClick={handleEdit}
                variant="outline"
                size="sm"
              >
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
              {onEnhanceWithAI && (
                <Button
                  onClick={() => onEnhanceWithAI(currentBottle)}
                  disabled={isEnhancingWithAI}
                  variant="outline"
                  size="sm"
                  className="border-burgundy-600 text-burgundy-700 hover:bg-burgundy-50"
                >
                  {isEnhancingWithAI ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Enhance with AI
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button 
              onClick={handleProcessBottle}
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
            >
              Queue for Addition
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        ) : (
          // Edit mode buttons
          <>
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
            >
              Cancel Edit
            </Button>
            <Button 
              onClick={() => {
                setIsEditMode(false);
                handleProcessBottle();
              }}
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
            >
              Save & Add to Collection
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}