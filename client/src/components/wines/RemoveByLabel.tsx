import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Upload, Trash, X } from "lucide-react";
import { Wine } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { WineGlassIcon } from "@/components/icons/wine-glass-icon";
import { formatPrice } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Simple wine match card component
function WineMatchCard({ wine, isSelected, onToggleSelect }: { 
  wine: Wine; 
  isSelected: boolean; 
  onToggleSelect: () => void;
}) {
  return (
    <div 
      className={`border rounded-md p-4 transition-colors duration-200 
        ${isSelected ? 'border-burgundy-400 bg-burgundy-50' : 'border-gray-200 hover:border-burgundy-200'}`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={() => onToggleSelect()}
            className="data-[state=checked]:bg-burgundy-600 data-[state=checked]:border-burgundy-600"
          />
        </div>
        
        <div className="flex flex-1 gap-4">
          <div className="flex-shrink-0">
            <WineGlassIcon type={wine.type} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-serif text-base text-gray-800">
              {wine.vintage && <span>{wine.vintage} </span>}
              {wine.producer}{" "}
              {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard} </span>}
              {wine.name || (wine.grapeVarieties && wine.grapeVarieties.split(",")[0].trim())}
            </h3>
            
            <div className="mt-1 text-sm text-gray-500">
              {wine.grapeVarieties && <span>{wine.grapeVarieties} · </span>}
              {wine.region && <span className="font-medium">{wine.region}</span>}
              {wine.subregion && <span className="text-gray-400 ml-1">({wine.subregion})</span>}
            </div>
            
            <div className="flex flex-wrap mt-2 gap-x-4 gap-y-1 text-xs text-gray-500">
              <div>
                {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} · {wine.bottleSize}
              </div>
              
              {wine.currentValue && (
                <div>
                  Value: {formatPrice(wine.currentValue)}
                </div>
              )}
              
              {wine.storageLocation && (
                <div>
                  Location: {wine.storageLocation}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RemoveByLabelProps {
  onComplete?: () => void;
}

export default function RemoveByLabel({ onComplete }: RemoveByLabelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedWines, setMatchedWines] = useState<Wine[]>([]);
  const [selectedWineIds, setSelectedWineIds] = useState<Set<number>>(new Set());
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

  // Handle file selection by drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.match('image.*')) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  // Prevent default behavior for drag events
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Analyze the uploaded label image
  const analyzeLabelMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      // We need to handle FormData specially with fetch in the apiRequest call
      const response = await fetch('/api/analyze-for-removal', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to analyze wine label');
      }

      const data = await response.json();
      return data;
    },
    onMutate: () => {
      setIsAnalyzing(true);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // The server response format might be different, so we need to adapt
      const matchedWines = data.matchedWines || [];
      
      setMatchedWines(matchedWines);
      setSelectedWineIds(new Set(matchedWines.map((wine: Wine) => wine.id)));
      setIsAnalyzing(false);
      
      if (matchedWines.length === 0) {
        toast({
          title: "No matches found",
          description: "We couldn't find any wines in your collection that match this label.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error analyzing label",
        description: error.message,
        variant: "destructive",
      });
      setIsAnalyzing(false);
    },
  });

  // Toggle selection of a wine
  const toggleWineSelection = (wineId: number) => {
    setSelectedWineIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(wineId)) {
        newSelected.delete(wineId);
      } else {
        newSelected.add(wineId);
      }
      return newSelected;
    });
  };

  // Remove selected wines
  const removeWinesMutation = useMutation({
    mutationFn: async () => {
      if (selectedWineIds.size === 0) return;
      
      const response = await apiRequest('POST', '/api/wines/remove-multiple', {
        wineIds: Array.from(selectedWineIds),
        notes: notes.trim() || 'Removed using label matching',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove wines');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wines removed",
        description: `${selectedWineIds.size} wine${selectedWineIds.size !== 1 ? 's' : ''} removed from your collection.`,
      });
      
      // Invalidate queries to refresh the collection data
      queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Reset the form
      setFile(null);
      setPreview(null);
      setMatchedWines([]);
      setSelectedWineIds(new Set());
      setNotes("");
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      toast({
        title: "Error removing wines",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset the form
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setMatchedWines([]);
    setSelectedWineIds(new Set());
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {!preview ? (
        // File upload area
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium">Upload Wine Label Photo</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Take a photo of a wine label or upload an existing image to find and remove matching wines from your collection.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => document.getElementById('labelUpload')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Button>
              <input
                id="labelUpload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => {
                  // This would ideally open the camera on mobile
                  document.getElementById('labelUpload')?.click();
                }}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Image preview and analysis section
        <div className="space-y-6">
          <div className="relative">
            <img
              src={preview}
              alt="Wine label preview"
              className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleReset}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {!matchedWines.length && !isAnalyzing && (
            <Button
              onClick={() => analyzeLabelMutation.mutate()}
              disabled={isAnalyzing}
              className="w-full"
            >
              Analyze Label
            </Button>
          )}
          
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-burgundy-600 mb-3" />
              <p className="text-gray-600">Analyzing wine label...</p>
            </div>
          )}
          
          {matchedWines.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">
                Matched Wines ({matchedWines.length})
              </h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto px-1">
                {matchedWines.map((wine) => (
                  <WineMatchCard
                    key={wine.id}
                    wine={wine}
                    isSelected={selectedWineIds.has(wine.id)}
                    onToggleSelect={() => toggleWineSelection(wine.id)}
                  />
                ))}
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Removal Notes (Optional)
                </h4>
                <Textarea
                  placeholder="Enter notes about why these wines are being removed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-24 resize-none"
                />
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="destructive"
                  disabled={selectedWineIds.size === 0 || removeWinesMutation.isPending}
                  onClick={() => removeWinesMutation.mutate()}
                  className="flex items-center gap-2"
                >
                  {removeWinesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="h-4 w-4" />
                  )}
                  Remove {selectedWineIds.size} Wine{selectedWineIds.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}