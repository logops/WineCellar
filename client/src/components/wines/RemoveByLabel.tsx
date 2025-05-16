import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Upload, Trash, X } from "lucide-react";
import { Wine } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import WineMatchCard from "./WineMatchCard";
import { Textarea } from "@/components/ui/textarea";

interface RemoveByLabelProps {
  onComplete?: () => void;
}

export default function RemoveByLabel({ onComplete }: RemoveByLabelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedWines, setMatchedWines] = useState<Wine[]>([]);
  const [selectedWineIds, setSelectedWineIds] = useState<number[]>([]);
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // This would typically open a camera UI component
      // For now, we'll just simulate by opening the file dialog
      document.getElementById('file-upload')?.click();
      // Don't forget to stop the stream in a real implementation
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast({
        title: "Camera Access Error",
        description: "Could not access your camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Analyze the wine label image
  const analyzeLabelMutation = useMutation({
    mutationFn: async () => {
      if (!file) return null;
      
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await apiRequest('POST', '/api/analyze-for-removal', formData);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data && data.matchedWines && data.matchedWines.length > 0) {
        setMatchedWines(data.matchedWines);
      } else {
        toast({
          title: "No Matches Found",
          description: "We couldn't match any wines in your cellar with this label.",
          variant: "destructive",
        });
      }
      setIsAnalyzing(false);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "There was a problem analyzing the wine label.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  });

  // Toggle wine selection
  const toggleWineSelection = (wineId: number) => {
    setSelectedWineIds(prev => {
      if (prev.includes(wineId)) {
        return prev.filter(id => id !== wineId);
      } else {
        return [...prev, wineId];
      }
    });
  };

  // Remove selected wines
  const removeWinesMutation = useMutation({
    mutationFn: async (wineIds: number[]) => {
      const response = await apiRequest('POST', '/api/wines/remove-multiple', { 
        wineIds,
        notes: notes.trim() || undefined 
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wines Removed",
        description: `Successfully removed ${selectedWineIds.length} wine(s) from your cellar.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      setFile(null);
      setPreview(null);
      setMatchedWines([]);
      setSelectedWineIds([]);
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast({
        title: "Removal Failed",
        description: error.message || "There was a problem removing the selected wines.",
        variant: "destructive",
      });
    }
  });

  const handleRemoveSelected = () => {
    if (selectedWineIds.length === 0) {
      toast({
        title: "No Wines Selected",
        description: "Please select at least one wine to remove.",
        variant: "destructive",
      });
      return;
    }
    
    removeWinesMutation.mutate(selectedWineIds);
  };

  const resetProcess = () => {
    setFile(null);
    setPreview(null);
    setMatchedWines([]);
    setSelectedWineIds([]);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-serif mb-4">Remove Wines by Label</h2>
      
      {!preview && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg mb-6">
          <p className="text-gray-500 mb-4">Upload a photo of wine label(s) to find and remove from your cellar</p>
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleCameraCapture}
              className="bg-burgundy-600 hover:bg-burgundy-700"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
            
            <Button 
              onClick={() => document.getElementById('file-upload')?.click()}
              variant="outline"
              className="border-burgundy-300 text-burgundy-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}
      
      {preview && (
        <div className="mb-6">
          <div className="relative">
            <img 
              src={preview} 
              alt="Wine label preview" 
              className="max-h-64 rounded-lg mx-auto"
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 bg-white opacity-80 hover:opacity-100"
              onClick={resetProcess}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {matchedWines.length === 0 && !isAnalyzing && (
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={() => analyzeLabelMutation.mutate()}
                className="bg-burgundy-600 hover:bg-burgundy-700"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>Analyze Label</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
      
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-burgundy-600 mb-4" />
          <p className="text-gray-600">Analyzing wine label and searching your cellar...</p>
        </div>
      )}
      
      {matchedWines.length > 0 && (
        <div>
          <h3 className="font-medium text-lg mb-3">Matched Wines in Your Cellar</h3>
          <p className="text-sm text-gray-500 mb-4">
            Select the wines you want to remove. You can select multiple bottles if they match.
          </p>
          
          <div className="space-y-3 mb-6">
            {matchedWines.map(wine => (
              <WineMatchCard
                key={wine.id}
                wine={wine}
                isSelected={selectedWineIds.includes(wine.id)}
                onToggleSelect={() => toggleWineSelection(wine.id)}
              />
            ))}
          </div>
          
          <div className="mt-4 mb-6">
            <label htmlFor="consumption-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Consumption Notes (Optional)
            </label>
            <Textarea
              id="consumption-notes"
              placeholder="Add notes about these wines (e.g., occasion, tasting notes, who you shared them with)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={handleRemoveSelected}
              disabled={removeWinesMutation.isPending || selectedWineIds.length === 0}
            >
              {removeWinesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Remove Selected ({selectedWineIds.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}