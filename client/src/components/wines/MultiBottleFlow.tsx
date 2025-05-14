import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wine } from "lucide-react";
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

interface MultiBottleFlowProps {
  imageData: string;
  onComplete: () => void;
  onCancel: () => void;
  onBottleSelected: (bottle: WineBottleData, index: number, total: number) => void;
  existingWines?: any[];
}

export function MultiBottleFlow({ 
  imageData, 
  onComplete, 
  onCancel, 
  onBottleSelected,
  existingWines = []
}: MultiBottleFlowProps) {
  const [loading, setLoading] = useState(true);
  const [bottleData, setBottleData] = useState<MultiBottleData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedBottles, setSkippedBottles] = useState<number[]>([]);
  const { toast } = useToast();

  // Load the bottle data on mount
  useEffect(() => {
    const loadBottleData = async () => {
      try {
        const response = await fetch('/api/analyze-wine-label?detectMultiple=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze wine bottles');
        }
        
        const result = await response.json();
        
        if (!result.data || !result.data.bottles || !Array.isArray(result.data.bottles) || result.data.bottles.length === 0) {
          throw new Error('No readable wine bottles found');
        }
        
        setBottleData(result.data);
        
        // Select the first bottle
        selectBottle(0, result.data.bottles);
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to analyze wine bottles';
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        onCancel();
      } finally {
        setLoading(false);
      }
    };
    
    loadBottleData();
  }, [imageData, onBottleSelected, onCancel, toast]);

  // Handle bottle selection
  const selectBottle = (index: number, bottles: WineBottleData[]) => {
    const total = bottles.length;
    
    // Check if this bottle is readable
    if (!bottles[index].isReadable) {
      // Skip unreadable bottles
      setSkippedBottles(prev => [...prev, index]);
      handleSkip();
      return;
    }
    
    // Check if this is a duplicate of an existing wine
    const isDuplicate = existingWines.some(existingWine => 
      existingWine.producer === bottles[index].producer &&
      existingWine.name === bottles[index].name &&
      existingWine.vintage === bottles[index].vintage
    );
    
    if (isDuplicate) {
      toast({
        title: 'Duplicate Wine Detected',
        description: `${bottles[index].producer} ${bottles[index].vintage} ${bottles[index].name} already exists in your collection.`,
      });
    }
    
    // Pass the bottle data to the parent component
    onBottleSelected(bottles[index], index + 1, total);
  };

  // Handle next bottle
  const handleNext = () => {
    if (!bottleData) return;
    
    const newIndex = currentIndex + 1;
    
    if (newIndex >= bottleData.bottles.length) {
      // We've processed all bottles
      onComplete();
      return;
    }
    
    setCurrentIndex(newIndex);
    selectBottle(newIndex, bottleData.bottles);
  };

  // Handle skip
  const handleSkip = () => {
    if (!bottleData) return;
    
    // Mark as skipped
    setSkippedBottles(prev => [...prev, currentIndex]);
    
    // Go to next bottle
    const newIndex = currentIndex + 1;
    
    if (newIndex >= bottleData.bottles.length) {
      // We've processed all bottles
      onComplete();
      return;
    }
    
    setCurrentIndex(newIndex);
    selectBottle(newIndex, bottleData.bottles);
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!bottleData) return 0;
    return (currentIndex / bottleData.bottles.length) * 100;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-burgundy-700">
            <Wine className="h-5 w-5" />
            Processing Multiple Bottles
          </CardTitle>
          <CardDescription>
            Analyzing your wine bottles...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 gap-3">
          <Progress value={30} className="w-full" />
          <p className="text-sm text-gray-500">This may take a moment</p>
        </CardContent>
      </Card>
    );
  }

  if (!bottleData) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-burgundy-700">
          <Wine className="h-5 w-5" />
          Multiple Bottles Detected
        </CardTitle>
        <CardDescription>
          {`Adding bottle ${currentIndex + 1} of ${bottleData.bottles.length}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Progress value={calculateProgress()} className="w-full mb-4" />
        
        {bottleData.bottles[currentIndex] && (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Producer:</span> {bottleData.bottles[currentIndex].producer || 'Unknown'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Wine:</span> {bottleData.bottles[currentIndex].name || 'Unknown'}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Vintage:</span> {bottleData.bottles[currentIndex].vintage || 'Unknown'}
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleSkip}
          variant="outline"
        >
          Skip This Bottle
        </Button>
        <Button 
          onClick={handleNext}
          className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
        >
          Next Bottle
        </Button>
      </CardFooter>
    </Card>
  );
}