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
import { Badge } from "@/components/ui/badge";

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
  const [editedBottlesMap, setEditedBottlesMap] = useState<{[index: number]: WineBottleData}>({});
  const [showSummary, setShowSummary] = useState(false);
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
    
    // Store the edited bottle in our map for later use in batch processing
    if (isEditMode && editedBottle) {
      setEditedBottlesMap(prev => ({
        ...prev,
        [currentIndex]: {...editedBottle}
      }));
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
      // We've processed all bottles, show the summary screen
      setShowSummary(true);
      return;
    }
    
    setCurrentIndex(newIndex);
    
    // Reset edit mode for the new bottle
    setIsEditMode(false);
    setEditedBottle(null);
  };
  
  // Handle final confirmation and batch processing
  const handleFinishBatch = () => {
    // We've processed all bottles, now do the batch processing
    const bottlesToAddCount = bottlesToAdd.length;
    const skippedCount = skippedBottles.length;
    const totalCount = bottleData.bottles.length;
    
    // Debug logging to make sure we're using edited bottles
    console.log("Final edited bottles map before batch processing:", editedBottlesMap);
    console.log("Bottles marked to add:", bottlesToAdd);
    
    // Batch add all the bottles that are queued for addition
    if (bottlesToAddCount > 0) {
      // For each bottle marked to add, process it with addToCollection=true
      bottlesToAdd.forEach(index => {
        // Check if this bottle has edits - IMPORTANT: always prioritize edited data
        const bottleToProcess = editedBottlesMap[index] || bottleData.bottles[index];
        
        // Log the exact data we're using for this bottle
        console.log(`Processing bottle ${index} with data:`, bottleToProcess);
        
        // Send the bottle to be processed with addToCollection=true
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
      
      // Build the updated bottle object
      const updatedBottle = {
        ...editedBottle,
        [field]: value
      };
      
      // Update the edited bottle data
      setEditedBottle(updatedBottle);
      
      // Also immediately update the edited bottles map to ensure persistence
      if (valueHasChanged) {
        setEditedBottlesMap(prev => ({
          ...prev,
          [currentIndex]: updatedBottle
        }));
        
        // Mark as having edits for the dialog
        setHasEdits(true);
      } else {
        // Check if any other fields still have edits
        const otherFieldsEdited = Object.keys(editedBottle).some(key => {
          if (key === field) return false; // Skip the current field
          const k = key as keyof WineBottleData;
          return currentBottle?.[k] !== editedBottle[k];
        });
        
        setHasEdits(otherFieldsEdited);
        
        // Update edit map if we still have edits
        if (otherFieldsEdited) {
          setEditedBottlesMap(prev => ({
            ...prev,
            [currentIndex]: updatedBottle
          }));
        } else {
          // Remove from edit map if no more edits
          setEditedBottlesMap(prev => {
            const newMap = {...prev};
            delete newMap[currentIndex];
            return newMap;
          });
        }
      }
    }
  };

  // Function to render a bottle item in the summary
  const renderBottleItem = (index: number, isSkipped: boolean = false) => {
    const bottle = editedBottlesMap[index] || bottleData.bottles[index];
    
    return (
      <div key={index} className="p-3 border rounded-md mb-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold">
              {bottle.vintage ? `${bottle.vintage} ` : ''}
              {bottle.producer || 'Unknown Producer'}
              {bottle.name ? ` ${bottle.name}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {bottle.region || ''}{bottle.region && bottle.subregion ? ', ' : ''}{bottle.subregion || ''}
            </p>
            {bottle.grapeVarieties && <p className="text-xs">{bottle.grapeVarieties}</p>}
          </div>
          {isSkipped ? (
            <Badge variant="outline" className="bg-slate-100">Skipped</Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Queued</Badge>
          )}
        </div>
      </div>
    );
  };

  // Render summary screen if we're at the end
  if (showSummary) {
    // Debug - print all edited bottles
    console.log("Edited bottles map:", editedBottlesMap);
    console.log("Bottles to add:", bottlesToAdd);
    
    return (
      <div>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-burgundy-700">
              <Wine className="h-5 w-5" />
              Wine Import Summary
            </CardTitle>
            <CardDescription>
              Review the wines below before adding them to your collection
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-base font-medium mb-2">Wines to Add ({bottlesToAdd.length})</h3>
              <div className="max-h-60 overflow-y-auto">
                {bottlesToAdd.length > 0 ? (
                  bottlesToAdd.map(index => renderBottleItem(index))
                ) : (
                  <p className="text-sm text-muted-foreground p-2">No wines selected for addition</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-2">Skipped Wines ({skippedBottles.length})</h3>
              <div className="max-h-40 overflow-y-auto">
                {skippedBottles.length > 0 ? (
                  skippedBottles.map(index => renderBottleItem(index, true))
                ) : (
                  <p className="text-sm text-muted-foreground p-2">No wines were skipped</p>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              onClick={handleCancel}
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFinishBatch}
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
              disabled={bottlesToAdd.length === 0}
            >
              Add {bottlesToAdd.length} {bottlesToAdd.length === 1 ? 'Wine' : 'Wines'} to Collection
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Confirmation dialog for preserving edits */}
      <AlertDialog open={showConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keep your edits?</AlertDialogTitle>
            <AlertDialogDescription>
              You've made changes to this wine's information. Would you like to keep these edits when adding to your collection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleDiscardEdits()}>Discard Edits</AlertDialogCancel>
            <AlertDialogAction onClick={() => processBottleWithEdits()} className="bg-burgundy-600 text-white hover:bg-burgundy-700">
              Keep Edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
                    {isDuplicate && (
                      <Badge variant="outline" className="mb-2 text-xs bg-amber-50 border-amber-200 text-amber-700">
                        Duplicate - Already in your collection
                      </Badge>
                    )}
                  </p>
                  
                  <h3 className="font-serif font-semibold text-lg">
                    {displayBottle.vintage ? `${displayBottle.vintage} ` : ''}
                    {displayBottle.producer || 'Unknown Producer'}
                    {displayBottle.name ? ` ${displayBottle.name}` : ''}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground">
                    {displayBottle.region && <span>{displayBottle.region}</span>}
                    {displayBottle.region && displayBottle.subregion && <span>, </span>}
                    {displayBottle.subregion && <span>{displayBottle.subregion}</span>}
                  </p>
                  
                  {displayBottle.grapeVarieties && (
                    <p className="text-sm">
                      <span className="font-medium">Grapes:</span> {displayBottle.grapeVarieties}
                    </p>
                  )}
                  
                  {displayBottle.type && (
                    <p className="text-sm">
                      <span className="font-medium">Type:</span> {displayBottle.type.charAt(0).toUpperCase() + displayBottle.type.slice(1)} Wine
                    </p>
                  )}
                  
                  {displayBottle.recommendedDrinkingWindow && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-sm">
                      <p className="font-medium">Recommended Drinking Window:</p>
                      <p>{displayBottle.recommendedDrinkingWindow.startYear} - {displayBottle.recommendedDrinkingWindow.endYear}</p>
                      {displayBottle.recommendedDrinkingWindow.isPastPrime && (
                        <p className="text-red-600 mt-1">Past prime drinking window</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // Edit mode - show form fields
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
                  // Make sure we save the edits to our editedBottlesMap
                  if (editedBottle) {
                    setEditedBottlesMap(prev => ({
                      ...prev,
                      [currentIndex]: {...editedBottle}
                    }));
                  }
                  
                  setIsEditMode(false);
                  handleProcessBottle();
                }}
                className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
              >
                Save & Queue for Addition
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}