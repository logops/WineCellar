import { useState, useRef, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Loader2, RefreshCw, Trash2, Wine } from "lucide-react";

interface RecommendedDrinkingWindow {
  startYear: number;
  endYear: number;
  notes: string;
  isPastPrime: boolean;
}

interface TastingProfile {
  characteristics: string | null;
  ageability: string | null;
  maturity: string | null;
}

interface ProductionDetails {
  winemaking: string | null;
  terroir: string | null;
  classification: string | null;
}

interface WineRating {
  score: number | null;
  confidenceLevel: string;
}

interface RecognitionResult {
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
  recommendedDrinkingWindow?: RecommendedDrinkingWindow;
  // New comprehensive analysis fields
  tasting?: TastingProfile;
  foodPairings?: string | null;
  servingSuggestions?: string | null;
  productionDetails?: ProductionDetails;
  rating?: WineRating;
  // Multiple bottle detection flags
  multipleBottlesDetected?: boolean;
  bottleCount?: number;
  imageData?: string;
}

interface WineLabelRecognitionProps {
  onResult: (result: RecognitionResult) => void;
  onCancel: () => void;
  detectMultipleBottles?: boolean;
  existingWines?: any[];
}

export function WineLabelRecognition({ onResult, onCancel, detectMultipleBottles = false, existingWines = [] }: WineLabelRecognitionProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mutation for analyzing wine label
  const analyzeMutation = useMutation({
    mutationFn: async (imageData: string) => {
      // Set loading state
      setLoadingText('Analyzing wine label...');
      
      // Determine which endpoint to use based on the detectMultipleBottles flag
      const endpoint = detectMultipleBottles 
        ? '/api/analyze-wine-label?detectMultiple=true' 
        : '/api/analyze-wine-label';
      
      console.log('Sending label analysis request to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData,
          checkForDuplicates: existingWines.length > 0
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze wine label');
      }
      
      const result = await response.json();
      console.log('Analysis response received', result.success);
      
      // Check if the result contains multiple bottles
      if (result.data && result.data.bottles && Array.isArray(result.data.bottles)) {
        // This is a multi-bottle response
        const bottles = result.data.bottles;
        
        if (bottles.length === 0) {
          throw new Error('No readable wine bottles detected in the image');
        }
        
        // Get the first bottle data for immediate display
        const firstBottle = bottles[0];
        
        // Create standard RecognitionResult with multi-bottle flags
        return {
          ...firstBottle,
          multipleBottlesDetected: bottles.length > 1,
          bottleCount: bottles.length,
          imageData // Store the original image data for multi-bottle processing
        } as RecognitionResult;
      }
      
      // Single bottle response
      return result.data as RecognitionResult;
    },
    onSuccess: (data) => {
      // Clear loading state
      setLoadingText('');
      
      // Pass result to parent component
      onResult(data);
      
      toast({
        title: 'Recognition Complete',
        description: 'Wine label analyzed successfully!',
      });
    },
    onError: (error) => {
      // Clear loading state
      setLoadingText('');
      
      toast({
        variant: 'destructive',
        title: 'Recognition Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze wine label',
      });
    }
  });

  // Handle file selection - will now automatically analyze after upload
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
      const imageData = reader.result as string;
      setImagePreview(imageData);
      
      // Automatically analyze the image after loading it
      setTimeout(() => {
        analyzeMutation.mutate(imageData);
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  // Start camera capture
  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Camera Access Failed',
        description: 'Could not access your camera. Please check permissions or try uploading an image instead.',
      });
    }
  };

  // Capture from camera - will now automatically analyze after capture
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
      
      // Automatically analyze the image after capturing
      setTimeout(() => {
        analyzeMutation.mutate(imageData);
      }, 100);
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
  };

  // Analyze the image
  const analyzeImage = () => {
    if (!imagePreview || analyzeMutation.isPending) return;
    analyzeImageImmediately();
  };
  
  // Immediate analysis without double-checking state
  const analyzeImageImmediately = () => {
    if (!imagePreview) return;
    analyzeMutation.mutate(imagePreview);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-burgundy-700">
          <Wine className="h-5 w-5" />
          Wine Label Recognition
        </CardTitle>
        <CardDescription>
          Take a photo of your wine label or upload an image
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Loading state */}
        {analyzeMutation.isPending ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-burgundy-600" />
            <p className="text-sm text-gray-500">{loadingText || 'Processing...'}</p>
          </div>
        ) : (
          <>
            {/* Camera capture mode */}
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
                    className="rounded-full w-10 h-10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : imagePreview ? (
              /* Image preview mode */
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Wine Label Preview" 
                  className="w-full rounded-md border" 
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button 
                    onClick={clearImage}
                    variant="destructive" 
                    size="icon"
                    className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-gray-200"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Upload mode */
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <div className="mb-4">
                  <Camera className="h-12 w-12 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 mb-4 text-center">
                  Upload an image or use your camera to capture a wine label
                </p>
                <div className="flex gap-4">
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
            
            {imagePreview && !analyzeMutation.isPending && (
              <Alert className="border-burgundy-200 bg-burgundy-50">
                <AlertTitle className="text-burgundy-800 flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Wine Label
                </AlertTitle>
                <AlertDescription className="text-burgundy-700 text-sm">
                  Please wait while we analyze your wine label. This may take a few moments as our AI identifies all wine bottles in the image.
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
          disabled={analyzeMutation.isPending}
        >
          Cancel
        </Button>
        {/* Removed the separate analyze button - now it's automatic */}
      </CardFooter>
    </Card>
  );
}