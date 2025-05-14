import { useState, useRef, ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, X, Loader2, Upload, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      // Determine which endpoint to use based on the detectMultipleBottles flag
      const endpoint = detectMultipleBottles 
        ? '/api/analyze-wine-label?detectMultiple=true' 
        : '/api/analyze-wine-label';
      
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
          bottleCount: bottles.length
        } as RecognitionResult;
      }
      
      // Single bottle response
      return result.data as RecognitionResult;
    },
    onSuccess: (data) => {
      onResult(data);
      toast({
        title: 'Recognition Complete',
        description: 'Wine label analyzed successfully!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Recognition Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze wine label',
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
  };

  // Analyze the image
  const analyzeImage = () => {
    if (!imagePreview) return;
    
    setLoadingText('Analyzing wine label...');
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
        {analyzeMutation.isPending ? (
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
                  <p className="text-sm font-medium">Upload a wine label image</p>
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
                <AlertTitle className="text-yellow-800">Recognition Tip</AlertTitle>
                <AlertDescription className="text-yellow-700 text-sm">
                  For best results, ensure the label is well-lit and clearly visible in the image.
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
        {imagePreview && (
          <Button 
            onClick={analyzeImage}
            disabled={analyzeMutation.isPending || !imagePreview}
            className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Label'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}