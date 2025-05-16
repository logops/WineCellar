import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  X,
  Trash,
  Loader2
} from "lucide-react";
import { Wine } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { WineGlassIcon } from "@/components/icons/wine-glass-icon";
import { parseDrinkingWindow } from "@/lib/date-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Add types for the LabelRemover component
interface LabelRemoverProps {
  onComplete?: () => void;
}

export default function LabelRemover({ onComplete }: LabelRemoverProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [matchedWines, setMatchedWines] = useState<Wine[]>([]);
  const [selectedWineIds, setSelectedWineIds] = useState<Set<number>>(new Set());
  const [removalNotes, setRemovalNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create an image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      setIsCapturing(true);
      
      // Using the MediaDevices API to access the camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create a video element to display the camera stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for the video to be ready
      await new Promise(resolve => {
        video.onplaying = resolve;
      });
      
      // Create a canvas to capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current frame to the canvas
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert the canvas to a blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else throw new Error("Failed to create image blob");
        }, 'image/jpeg', 0.95);
      });
      
      // Create a file from the blob
      const capturedFile = new File([blob], "captured-wine-label.jpg", { type: 'image/jpeg' });
      setSelectedFile(capturedFile);
      
      // Create a preview
      setImagePreview(canvas.toDataURL('image/jpeg'));
      
      // Stop all video tracks
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Error capturing image:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions or try uploading an image.",
        variant: "destructive"
      });
    } finally {
      setIsCapturing(false);
    }
  };
  
  // Clear the selected file and preview
  const clearSelection = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setMatchedWines([]);
    setSelectedWineIds(new Set());
  };
  
  // Handle wine analysis from label
  const analyzeWineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;
      
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await apiRequest('POST', '/api/analyze-for-removal', formData);
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.matchedWines && data.matchedWines.length > 0) {
        setMatchedWines(data.matchedWines);
        // Pre-select all matched wines
        setSelectedWineIds(new Set(data.matchedWines.map((wine: Wine) => wine.id)));
      } else {
        toast({
          title: "No Matches Found",
          description: "No wines in your cellar match this label. Try another photo or add this wine first.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('Error analyzing wine label:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the wine label. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Toggle wine selection
  const toggleWineSelection = (wineId: number) => {
    const newSelection = new Set(selectedWineIds);
    if (newSelection.has(wineId)) {
      newSelection.delete(wineId);
    } else {
      newSelection.add(wineId);
    }
    setSelectedWineIds(newSelection);
  };
  
  // Remove selected wines
  const removeWinesMutation = useMutation({
    mutationFn: async () => {
      const wineIds = Array.from(selectedWineIds);
      
      const response = await apiRequest('POST', '/api/wines/remove-multiple', {
        wineIds,
        notes: removalNotes || "Removed using label recognition"
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the wines query to refresh the collection
      queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      toast({
        title: "Success",
        description: `Successfully removed ${selectedWineIds.size} wine${selectedWineIds.size !== 1 ? 's' : ''} from your collection.`,
      });
      
      // Reset the component state
      clearSelection();
      setRemovalNotes("");
      
      // Call onComplete if provided
      if (onComplete) onComplete();
    },
    onError: (error) => {
      console.error('Error removing wines:', error);
      toast({
        title: "Removal Failed",
        description: "Could not remove the selected wines. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  return (
    <div className="flex flex-col space-y-4">
      {/* Image selection area */}
      {!imagePreview && (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={handleCameraCapture}
              disabled={isCapturing}
              className="w-1/2"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
            <Button 
              onClick={() => document.getElementById('label-upload')?.click()}
              className="w-1/2"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
          </div>
          <input
            id="label-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
      
      {/* Image preview and analysis area */}
      {imagePreview && (
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Wine Label" 
              className="w-full h-auto rounded-md border border-border"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 bg-background/80 rounded-full h-8 w-8"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {matchedWines.length === 0 && (
            <Button
              onClick={() => analyzeWineMutation.mutate()}
              disabled={analyzeWineMutation.isPending || matchedWines.length > 0}
              className="w-full font-serif"
            >
              {analyzeWineMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Wine Label...
                </>
              ) : (
                "Find Matching Wines"
              )}
            </Button>
          )}
        </div>
      )}
      
      {/* Matched wines list */}
      {matchedWines.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-serif font-medium">Matched Wines</h3>
          
          <ScrollArea className="max-h-[300px] pr-3">
            <div className="space-y-3">
              {matchedWines.map((wine) => (
                <div 
                  key={wine.id} 
                  className="flex items-start p-3 border border-border rounded-lg bg-card"
                >
                  <Checkbox 
                    checked={selectedWineIds.has(wine.id)}
                    onCheckedChange={() => toggleWineSelection(wine.id)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <WineGlassIcon type={wine.type} className="h-5 w-5 mr-2" />
                      <h4 className="font-medium line-clamp-2">
                        {wine.vintage} {wine.producer} {wine.name}
                      </h4>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {wine.region}{wine.subregion ? `, ${wine.subregion}` : ""}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-medium">In Cellar:</span> {wine.quantity} {wine.quantity === 1 ? 'bottle' : 'bottles'}
                    </div>
                    {wine.purchasePrice && (
                      <div className="text-sm">
                        <span className="font-medium">Price:</span> {formatPrice(wine.purchasePrice)}
                      </div>
                    )}
                    {(wine.drinkingWindowStart || wine.drinkingWindowEnd) && (
                      <div className="text-sm">
                        <span className="font-medium">Drinking Window:</span> {parseDrinkingWindow(wine)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="space-y-3">
            <Textarea
              placeholder="Add notes about why you're removing these wines (optional)"
              value={removalNotes}
              onChange={(e) => setRemovalNotes(e.target.value)}
              className="min-h-[80px]"
            />
            
            <Button
              onClick={() => removeWinesMutation.mutate()}
              disabled={selectedWineIds.size === 0 || removeWinesMutation.isPending}
              className="w-full font-serif"
              variant="destructive"
            >
              {removeWinesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing Wines...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Remove {selectedWineIds.size} {selectedWineIds.size === 1 ? 'Wine' : 'Wines'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}