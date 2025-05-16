import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import WineGlassIcon from '@/components/wines/WineGlassIcon';
import { apiRequest } from '@/lib/queryClient';
import { Wine } from '@shared/schema';

export default function RemoveByLabelPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedWines, setMatchedWines] = useState<Wine[]>([]);
  const [selectedWineIds, setSelectedWineIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const [, setLocation] = useLocation();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setMatchedWines([]);
    setSelectedWineIds([]);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/wines/match-label', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      setMatchedWines(data.matchedWines || []);
      
      // If no wines matched, show a message
      if ((data.matchedWines || []).length === 0) {
        toast({
          title: "No matches found",
          description: "No wines in your cellar match this label",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze image",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleWineSelection = (wineId: number) => {
    setSelectedWineIds(prevIds => {
      if (prevIds.includes(wineId)) {
        return prevIds.filter(id => id !== wineId);
      } else {
        return [...prevIds, wineId];
      }
    });
  };

  const handleRemoveWines = async () => {
    if (selectedWineIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one wine to remove",
        variant: "destructive",
      });
      return;
    }

    setIsRemoving(true);

    try {
      const result = await apiRequest('POST', '/api/wines/remove-multiple', {
        wineIds: selectedWineIds,
        notes: notes.trim() || 'Removed using wine label recognition'
      });

      if (result.ok) {
        toast({
          title: "Success",
          description: `Removed ${selectedWineIds.length} wine${selectedWineIds.length > 1 ? 's' : ''} from your cellar`,
          variant: "default",
        });
        setLocation('/collection');
      } else {
        throw new Error('Failed to remove wines');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove wines",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-serif mb-6">Remove by Label</h1>
      <p className="mb-6 text-gray-600">
        Take a photo of a wine label to quickly find and remove wines from your cellar.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="mb-6">
            <label 
              htmlFor="wine-image" 
              className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Wine label preview" className="max-h-64 mx-auto" />
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-lg font-elegant text-gray-600">Upload wine label image</p>
                  <p className="text-sm text-gray-500 mt-1">Click or drag and drop</p>
                </div>
              )}
              <input 
                id="wine-image" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
          </div>

          <Button 
            onClick={handleAnalyzeImage} 
            disabled={!selectedFile || isAnalyzing} 
            className="w-full mb-6"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing image...
              </>
            ) : (
              'Analyze Image'
            )}
          </Button>

          {matchedWines.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-serif mb-3">Notes (optional)</h2>
              <Textarea 
                placeholder="Add notes about why you're removing these wines..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="h-24 mb-3"
              />
              <Button 
                onClick={handleRemoveWines} 
                disabled={selectedWineIds.length === 0 || isRemoving}
                variant="destructive"
                className="w-full"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  `Remove ${selectedWineIds.length} Selected Wine${selectedWineIds.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          )}
        </div>

        <div>
          {matchedWines.length > 0 ? (
            <div>
              <h2 className="text-xl font-serif mb-3">Matched Wines ({matchedWines.length})</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {matchedWines.map((wine) => (
                  <Card 
                    key={wine.id}
                    className={`overflow-hidden transition-all cursor-pointer ${
                      selectedWineIds.includes(wine.id) ? 'ring-2 ring-burgundy-600' : 'hover:shadow-md'
                    }`}
                    onClick={() => toggleWineSelection(wine.id)}
                  >
                    <CardContent className="p-0">
                      <div className="flex p-4">
                        <div className="mr-4">
                          <WineGlassIcon type={wine.type} className="h-12 w-12" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {wine.vintage} {wine.producer} {wine.name}
                          </h3>
                          <div className="text-sm text-gray-600 mt-1">
                            {wine.region}{wine.subregion ? ` › ${wine.subregion}` : ''}
                          </div>
                          <div className="flex items-center mt-1 text-sm">
                            <span 
                              className={`mr-2 h-3 w-3 rounded-full ${
                                wine.type.toLowerCase().includes('red') ? 'bg-red-800' :
                                wine.type.toLowerCase().includes('white') ? 'bg-amber-400' :
                                wine.type.toLowerCase().includes('rose') || wine.type.toLowerCase().includes('rosé') ? 'bg-pink-400' :
                                'bg-purple-800'
                              }`} 
                            />
                            <span>{wine.type}</span>
                            <span className="mx-2">•</span>
                            <span>{wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className={`h-5 w-5 rounded border ${
                            selectedWineIds.includes(wine.id) 
                              ? 'bg-burgundy-600 border-burgundy-600' 
                              : 'border-gray-300'
                          }`}>
                            {selectedWineIds.includes(wine.id) && (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="h-4 w-4 text-white"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            isAnalyzing ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-burgundy-600 mx-auto mb-4" />
                  <p className="text-gray-600">Matching wines in your cellar...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">Click "Analyze Image" to find matching wines</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">Upload a wine label to get started</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}