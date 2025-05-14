import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wine, ChevronRight, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!bottleData || !bottleData.bottles.length) return 0;
    return ((currentIndex + 1) / bottleData.bottles.length) * 100;
  };

  // Get current bottle data
  const currentBottle = bottleData.bottles[currentIndex];

  // Check if the current bottle is a duplicate
  const isDuplicate = existingWines.some(existingWine => 
    existingWine.producer === currentBottle.producer &&
    existingWine.name === currentBottle.name &&
    existingWine.vintage === currentBottle.vintage
  );

  // Handle processing the current bottle
  const handleProcessBottle = () => {
    // Add this bottle to processed list
    setProcessedBottles(prev => [...prev, currentIndex]);
    
    // Send the bottle data for processing
    onProcessBottle(currentBottle, currentIndex + 1, bottleData.bottles.length);
    
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
        
        {currentBottle && (
          <div className="space-y-2 p-4 border rounded-md">
            <p className="text-sm">
              <span className="font-semibold">Producer:</span> {currentBottle.producer || 'Unknown'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Wine:</span> {currentBottle.name || 'Unknown'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Vintage:</span> {currentBottle.vintage || 'Unknown'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Region:</span> {currentBottle.region || 'Unknown'}
            </p>
            {isDuplicate && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                This wine already exists in your collection. Adding it will increase its quantity.
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
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
        </div>
        <Button 
          onClick={handleProcessBottle}
          className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
        >
          Add to Collection
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}