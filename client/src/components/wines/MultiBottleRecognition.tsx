import { useState, useRef, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, X, Loader2, Upload, Wine, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import BottleReviewCard from './BottleReviewCard';
import { checkDuplicateWine } from '@/lib/wineUtils';

interface WinePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RecommendedDrinkingWindow {
  startYear: number;
  endYear: number;
  notes: string;
  isPastPrime: boolean;
}

interface WineBottleAnalysis {
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
  isReadable: boolean;
  bottlePosition?: WinePosition;
  notes?: string;
  recommendedDrinkingWindow?: RecommendedDrinkingWindow;
}

interface MultiBottleResult {
  bottles: WineBottleAnalysis[];
}

interface MultiBottleRecognitionProps {
  onResult: (result: WineBottleAnalysis) => void;
  onCancel: () => void;
  wines?: any[]; // Used for duplicate checking
}

export function MultiBottleRecognition({ onResult, onCancel, wines = [] }: MultiBottleRecognitionProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [analyzedBottles, setAnalyzedBottles] = useState<WineBottleAnalysis[]>([]);
  const [currentBottleIndex, setCurrentBottleIndex] = useState(0);
  const [isReviewingBottles, setIsReviewingBottles] = useState(false);
  const [skippedBottles, setSkippedBottles] = useState<number[]>([]);
  const [unreadableBottles, setUnreadableBottles] = useState<number[]>([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState<{ [index: number]: boolean }>({});
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mutation for analyzing multiple wine bottles
  const analyzeMutation = useMutation({
    mutationFn: async (imageData: string) => {
      setIsAnalyzing(true);
      setLoadingText('Detecting wine bottles in image...');
      
      const response = await fetch('/api/analyze-multi-bottle', {
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
      return result.data as MultiBottleResult;
    },
    onSuccess: (data) => {
      setIsAnalyzing(false);
      
      if (!data.bottles || data.bottles.length === 0) {
        toast({
          title: 'No Wine Bottles Detected',
          description: 'No wine bottles were detected in the image. Please try again with a clearer image.',
          variant: 'destructive'
        });
        return;
      }
      
      // Check for unreadable bottles
      const unreadable = data.bottles
        .map((bottle, index) => !bottle.isReadable ? index : -1)
        .filter(index => index !== -1);
      
      setUnreadableBottles(unreadable);
      
      // Identify potential duplicates
      const duplicatesMap: { [index: number]: boolean } = {};
      data.bottles.forEach((bottle, index) => {
        if (bottle.isReadable) {
          const isDuplicate = wines.some(wine => 
            checkDuplicateWine(wine, {
              producer: bottle.producer || '',
              name: bottle.name || '',
              vintage: bottle.vintage || 0
            })
          );
          
          duplicatesMap[index] = isDuplicate;
        }
      });
      
      setPossibleDuplicates(duplicatesMap);
      setAnalyzedBottles(data.bottles);
      setCurrentBottleIndex(0);
      setSkippedBottles([]);
      setIsReviewingBottles(true);
      
      toast({
        title: 'Analysis Complete',
        description: `Detected ${data.bottles.length} wine bottles. Let's review them one by one.`,
      });
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast({
        variant: 'destructive',
        title: 'Recognition Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze wine bottles',
      });
    }
  });

  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please select an image file (JPEG, PNG, etc.)',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start camera capture
  const startCapture = async () => {
    try {
      setIsCapturing(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Camera Access Error',
        description: 'Could not access your camera. Please check permissions.',
      });
      setIsCapturing(false);
    }
  };

  // Capture from camera
  const captureImage = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      setImagePreview(imageData);
      
      // Stop the camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
    }
  };

  // Stop camera capture
  const stopCapture = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  // Clear the selected image
  const clearImage = () => {
    setImagePreview(null);
    setAnalyzedBottles([]);
    setIsReviewingBottles(false);
    setCurrentBottleIndex(0);
    setSkippedBottles([]);
    setUnreadableBottles([]);
  };

  // Analyze the image
  const analyzeImage = () => {
    if (!imagePreview) return;
    analyzeMutation.mutate(imagePreview);
  };

  // Handle confirming the current bottle
  const confirmCurrentBottle = () => {
    const currentBottle = analyzedBottles[currentBottleIndex];
    if (currentBottle) {
      onResult(currentBottle);
      
      // Check if we've reviewed all bottles
      if (currentBottleIndex >= analyzedBottles.length - 1) {
        finishReview();
      } else {
        // Move to the next bottle
        setCurrentBottleIndex(prevIndex => prevIndex + 1);
      }
    }
  };

  // Handle skipping the current bottle
  const skipCurrentBottle = () => {
    setSkippedBottles(prev => [...prev, currentBottleIndex]);
    
    // Check if we've reviewed all bottles
    if (currentBottleIndex >= analyzedBottles.length - 1) {
      finishReview();
    } else {
      // Move to the next bottle
      setCurrentBottleIndex(prevIndex => prevIndex + 1);
    }
  };

  // Finish the review process
  const finishReview = () => {
    toast({
      title: 'Multi-bottle Review Complete',
      description: `Added ${analyzedBottles.length - skippedBottles.length - unreadableBottles.length} wines to your collection.`,
    });
    setIsReviewingBottles(false);
    onCancel();
  };

  // Get the total number of readable bottles
  const readableBottleCount = analyzedBottles.filter(bottle => bottle.isReadable).length;

  // Get the current bottle number (for display purposes)
  const currentBottleNumber = analyzedBottles.filter(
    (_, index) => index <= currentBottleIndex && !unreadableBottles.includes(index)
  ).length;

  if (isReviewingBottles && analyzedBottles.length > 0) {
    const currentBottle = analyzedBottles[currentBottleIndex];
    const isCurrentUnreadable = unreadableBottles.includes(currentBottleIndex);
    const isCurrentSkipped = skippedBottles.includes(currentBottleIndex);
    const isPossibleDuplicate = possibleDuplicates[currentBottleIndex];
    
    // Skip unreadable bottles automatically
    if (isCurrentUnreadable) {
      // If this is the last bottle, finish the review
      if (currentBottleIndex >= analyzedBottles.length - 1) {
        finishReview();
      } else {
        // Move to the next bottle
        setCurrentBottleIndex(prevIndex => prevIndex + 1);
      }
      return null;
    }
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-burgundy-700">
            <Wine className="h-5 w-5" />
            Wine Label Recognition
          </CardTitle>
          <CardDescription className="flex justify-between items-center">
            <span>Reviewing bottle {currentBottleNumber} of {readableBottleCount}</span>
            <Progress className="w-1/2" value={(currentBottleNumber / readableBottleCount) * 100} />
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {imagePreview && (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Wine Label" 
                className="w-full max-h-64 object-contain rounded-md" 
              />
              {currentBottle.bottlePosition && (
                <div 
                  className="absolute border-2 border-burgundy-500" 
                  style={{
                    left: `${currentBottle.bottlePosition.x * 100}%`,
                    top: `${currentBottle.bottlePosition.y * 100}%`,
                    width: `${currentBottle.bottlePosition.width * 100}%`,
                    height: `${currentBottle.bottlePosition.height * 100}%`,
                  }}
                />
              )}
            </div>
          )}
          
          {isPossibleDuplicate && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-800" />
              <AlertTitle className="text-yellow-800">Possible Duplicate</AlertTitle>
              <AlertDescription className="text-yellow-700 text-sm">
                This wine may already exist in your collection. Please review carefully.
              </AlertDescription>
            </Alert>
          )}
          
          <BottleReviewCard
            wine={{
              producer: currentBottle.producer || '',
              name: currentBottle.name || '',
              vintage: currentBottle.vintage || new Date().getFullYear(),
              type: currentBottle.type?.toLowerCase() || 'red',
              region: currentBottle.region || '',
              subregion: currentBottle.subregion || '',
              grapeVarieties: currentBottle.grapeVarieties || '',
              country: currentBottle.country || ''
            }}
            confidence={currentBottle.confidence}
            onConfirm={confirmCurrentBottle}
            onSkip={skipCurrentBottle}
            isPossibleDuplicate={isPossibleDuplicate}
          />
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={finishReview}
          >
            Finish
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-burgundy-700">
          <Wine className="h-5 w-5" />
          Multi-Bottle Recognition
        </CardTitle>
        <CardDescription>
          Take a photo containing multiple wine bottles to analyze them all at once
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {analyzeMutation.isPending || isAnalyzing ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-burgundy-600" />
            <p className="text-sm text-gray-500">{loadingText}</p>
          </div>
        ) : (
          <>
            {isCapturing ? (
              <div className="relative">
                <video 
                  ref={videoRef} 
                  className="w-full h-64 object-cover rounded-md bg-gray-100"
                  autoPlay 
                  playsInline
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button 
                    onClick={captureImage} 
                    className="rounded-full w-12 h-12 p-0 bg-white border border-gray-200 hover:bg-gray-100"
                  >
                    <Camera className="h-6 w-6 text-burgundy-600" />
                  </Button>
                  <Button 
                    onClick={stopCapture}
                    variant="destructive" 
                    size="icon"
                    className="rounded-full w-12 h-12 p-0"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            ) : imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Wine Label" 
                  className="w-full max-h-64 object-contain rounded-md" 
                />
                <Button
                  onClick={clearImage}
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full h-8 w-8 bg-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-md p-6 flex flex-col items-center text-center gap-4">
                <div className="bg-gray-50 rounded-full p-3">
                  <Upload className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Upload a photo with multiple wine bottles</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Drag and drop or click to browse
                  </p>
                </div>
                <Label 
                  htmlFor="label-image" 
                  className="bg-burgundy-600 hover:bg-burgundy-700 text-white py-2 px-4 rounded-md cursor-pointer text-sm"
                >
                  Browse Images
                </Label>
                <input
                  ref={fileInputRef}
                  id="label-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
            
            {!isCapturing && !imagePreview && (
              <div className="flex justify-center">
                <Button 
                  onClick={startCapture}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>Take Photo</span>
                </Button>
              </div>
            )}
            
            {imagePreview && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTitle className="text-yellow-800">Multi-Bottle Recognition Tips</AlertTitle>
                <AlertDescription className="text-yellow-700 text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Make sure bottles have visible labels</li>
                    <li>Good lighting improves recognition accuracy</li>
                    <li>Arrange bottles with minimal overlap</li>
                    <li>Close-up shots work better than distant ones</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={analyzeMutation.isPending || isAnalyzing}
        >
          Cancel
        </Button>
        {imagePreview && !isReviewingBottles && (
          <Button 
            onClick={analyzeImage}
            disabled={analyzeMutation.isPending || isAnalyzing || !imagePreview}
            className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Bottles'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}