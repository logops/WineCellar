import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wine, ChevronRight, SkipForward, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onProcessBottle: (bottle: WineBottleData, index: number, total: number) => void;
  existingWines?: any[];
}

export function MultiBottleWizard({ 
  bottleData, 
  onComplete, 
  onCancel, 
  onProcessBottle,
  existingWines = []
}: MultiBottleWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedBottles, setSkippedBottles] = useState<number[]>([]);
  const [processedBottles, setProcessedBottles] = useState<number[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBottle, setEditedBottle] = useState<WineBottleData | null>(null);
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

  // Handle processing the current bottle
  const handleProcessBottle = () => {
    // Add this bottle to processed list
    setProcessedBottles(prev => [...prev, currentIndex]);
    
    // Send the bottle data for processing
    // Use the edited bottle data if in edit mode, otherwise use the original
    const bottleToProcess = isEditMode && editedBottle ? editedBottle : currentBottle;
    onProcessBottle(bottleToProcess, currentIndex + 1, bottleData.bottles.length);
    
    // Show success message
    toast({
      title: "Wine Added",
      description: isDuplicate 
        ? "This wine already exists in your collection. The quantity has been increased."
        : "The wine has been added to your collection.",
    });
    
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
      // We've processed all bottles
      const processedCount = processedBottles.length;
      const totalCount = bottleData.bottles.length;
      
      toast({
        title: "All Bottles Processed",
        description: `Added ${processedCount} of ${totalCount} wine bottles to your collection.`,
      });
      
      onComplete();
      return;
    }
    
    setCurrentIndex(newIndex);
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
  };
  
  // Update edited bottle field
  const handleFieldChange = (field: keyof WineBottleData, value: any) => {
    if (editedBottle) {
      setEditedBottle({
        ...editedBottle,
        [field]: value
      });
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
        <Progress value={calculateProgress()} className="w-full mb-4" />
        
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
            </div>
            <Button 
              onClick={handleProcessBottle}
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
            >
              Add to Collection
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