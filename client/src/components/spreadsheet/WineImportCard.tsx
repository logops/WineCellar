import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Check, X, Edit, AlertTriangle, Grape } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WineData {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: {
    name?: string;
    producer?: string;
    vintage?: number | 'NV';
    type?: string;
    vineyard?: string;
    region?: string;
    subregion?: string;
    grapeVarieties?: string;
    bottleSize?: string;
    quantity?: number;
    purchasePrice?: number;
    currentValue?: number;
    purchaseDate?: string;
    purchaseLocation?: string;
    drinkingWindowStart?: string;
    drinkingWindowEnd?: string;
    drinkingStatus?: string;
    storageLocation?: string;
    notes?: string;
    rating?: number;
    binNumber?: string;
  };
  confidence: 'high' | 'medium' | 'low';
  missingRequiredFields: string[];
  isPotentialDuplicate: boolean;
  duplicateId?: number;
  needsVerification: boolean;
  storageLocation?: string;
  producerVerified?: boolean;
  originalProducer?: string;
  lwinMatches?: {
    query: string;
    exactMatch: boolean;
    matches: Array<{
      producer: string;
      wineName: string;
      vintage?: number;
      region?: string;
      country?: string;
      type?: string;
      confidence: number;
      source: string;
    }>;
    needsUserSelection: boolean;
    selectedMatch?: any;
  };

  aiDrinkingWindowRecommendation?: {
    start?: string;
    end?: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    grapeVarieties?: string | null;
    region?: string | null;
    subregion?: string | null;
    notes?: string | null;
    cellaring?: string | null;
    pairings?: string | null;
  };
}

interface WineImportCardProps {
  wine: WineData;
  onApprove: (wine: WineData, useAiRecommendation?: boolean) => void;
  onReject: (wine: WineData) => void;
  onEdit: (wine: WineData) => void;
  editable?: boolean;
  allProcessedWines?: WineData[];
  setAllProcessedWines?: React.Dispatch<React.SetStateAction<WineData[]>>;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (rowIndex: number) => void;
}

export default function WineImportCard({ 
  wine, 
  onApprove, 
  onReject, 
  onEdit, 
  editable = false,
  allProcessedWines,
  setAllProcessedWines,
  selectable = false,
  isSelected = false,
  onSelect
}: WineImportCardProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiRecommendationDialogOpen, setAiRecommendationDialogOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiEnhancement, setAiEnhancement] = useState<any>(null);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatVintage = (vintage: number | 'NV' | undefined) => {
    if (vintage === 'NV') return 'NV';
    if (vintage && typeof vintage === 'number') return vintage.toString();
    return '';
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return '';
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className={`relative ${selectable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => selectable && onSelect?.(wine.rowIndex)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {selectable && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect?.(wine.rowIndex)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {formatVintage(wine.mappedData.vintage)} {wine.mappedData.producer} {wine.mappedData.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {wine.mappedData.type} • {wine.mappedData.region}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(wine.confidence)}>
              {wine.confidence.charAt(0).toUpperCase() + wine.confidence.slice(1)} confidence
            </Badge>
            {wine.isPotentialDuplicate && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Potential duplicate
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Auto-identified section */}
        {wine.mappedData.region && (
          <div>
            <span className="text-xs text-muted-foreground">Auto-identified:</span>
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs text-purple-700 bg-purple-50">
                Region-{wine.mappedData.region}
              </Badge>
            </div>
          </div>
        )}

        {/* Two-column layout matching the screenshot */}
        <div className="grid grid-cols-2 gap-8">
          {/* Wine Details Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Wine Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grape(s):</span>
                <span className="text-right">{wine.mappedData.grapeVarieties || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vineyard:</span>
                <span className="text-right">{wine.mappedData.vineyard || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subregion:</span>
                <span className="text-right">{wine.mappedData.subregion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bottle Size:</span>
                <span className="text-right">{wine.mappedData.bottleSize || '750ml'}</span>
              </div>
            </div>
          </div>

          {/* Purchase Information Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Purchase Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="text-right">{wine.mappedData.quantity || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="text-right">{formatPrice(wine.mappedData.purchasePrice) || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="text-right">{wine.mappedData.purchaseDate ? formatDate(wine.mappedData.purchaseDate) : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="text-right">{wine.mappedData.storageLocation || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drinking Window Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Drinking Window</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current:</span>
              <span>
                {wine.mappedData.drinkingWindowStart && wine.mappedData.drinkingWindowEnd
                  ? `${wine.mappedData.drinkingWindowStart} - ${wine.mappedData.drinkingWindowEnd}`
                  : 'Not set - Not set'
                }
              </span>
            </div>
            {wine.aiDrinkingWindowRecommendation && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">AI Suggested:</span>
                <div className="flex items-center gap-2">
                  <span>
                    {wine.aiDrinkingWindowRecommendation.start} - {wine.aiDrinkingWindowRecommendation.end}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-1 ${
                      wine.aiDrinkingWindowRecommendation.confidence === 'high' 
                        ? 'border-green-300 text-green-700 bg-green-50' 
                        : wine.aiDrinkingWindowRecommendation.confidence === 'medium'
                        ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                        : 'border-red-300 text-red-700 bg-red-50'
                    }`}
                  >
                    {wine.aiDrinkingWindowRecommendation.confidence}
                  </Badge>
                  <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-600">?</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* Verification Notice */}
        {wine.needsVerification && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-amber-800">Needs verification</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              This wine information needs manual verification before import.
            </p>
          </div>
        )}

        {wine.missingRequiredFields.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-1">Missing required fields:</h4>
            <ul className="list-disc list-inside text-sm text-red-700">
              {wine.missingRequiredFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Button Layout */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(wine)}
              className="h-8 text-gray-600 hover:text-gray-800"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setAiRecommendationDialogOpen(true);
                setIsEnhancing(true);
                try {
                  const response = await fetch('/api/enhance-wine', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(wine.mappedData),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to enhance wine');
                  }

                  const enhancement = await response.json();
                  setAiEnhancement(enhancement);
                } catch (error: any) {
                  console.error('Enhancement error:', error);
                  toast({
                    title: "Enhancement failed",
                    description: error.message,
                    variant: "destructive",
                  });
                  setAiRecommendationDialogOpen(false);
                } finally {
                  setIsEnhancing(false);
                }
              }}
              disabled={isEnhancing}
              className="h-8 text-purple-600 border-purple-300 hover:bg-purple-50 disabled:opacity-50"
            >
              {isEnhancing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-1"></div>
                  Enhancing...
                </>
              ) : (
                <>
                  <Grape className="h-4 w-4 mr-1" />
                  Enhance with AI
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(wine)}
              className="h-8 text-red-600 border-red-300 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Skip
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => onApprove(wine)}
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Import as is
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wine Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Mapped Data:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
                {Object.entries(wine.mappedData).map(([key, value]) => {
                  if (value !== undefined && value !== null && value !== '') {
                    return (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Original Data:</h4>
              <div className="text-sm bg-gray-50 p-3 rounded font-mono">
                {JSON.stringify(wine.originalData, null, 2)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Enhancement Dialog */}
      <Dialog open={aiRecommendationDialogOpen} onOpenChange={setAiRecommendationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">AI Wine Analysis</DialogTitle>
            <p className="text-gray-600 mt-2">
              AI has analyzed your wine and found the following information. Fields highlighted in green will be updated with the enhanced data. Would you like to apply these enhancements?
            </p>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
            {/* Loading State */}
            {isEnhancing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Master Sommelier analyzing wine...</p>
              </div>
            )}

            {/* Recommended Drinking Window Section */}
            {aiEnhancement?.drinkingWindow && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Recommended Drinking Window</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600">Will update</span>
                    <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="text-2xl font-semibold text-gray-900 mb-3">
                  {aiEnhancement.drinkingWindow.start} - {aiEnhancement.drinkingWindow.end}
                </div>
                
                <p className="text-gray-700 leading-relaxed">
                  {aiEnhancement.drinkingWindow.reasoning}
                </p>
                
                <div className="mt-3">
                  <Badge 
                    variant="outline" 
                    className={`${
                      aiEnhancement.drinkingWindow.confidence === 'high' 
                        ? 'border-green-300 text-green-700 bg-green-50' 
                        : aiEnhancement.drinkingWindow.confidence === 'medium'
                        ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                        : 'border-red-300 text-red-700 bg-red-50'
                    }`}
                  >
                    {aiEnhancement.drinkingWindow.confidence} confidence
                  </Badge>
                </div>
              </div>
            )}

            {/* Wine Information Section */}
            {aiEnhancement?.wineInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Wine Information</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600">Will update</span>
                    <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="border-l-4 border-green-400 pl-3">
                      <h4 className="font-medium text-gray-900 mb-1">Grape Varieties:</h4>
                      <p className="text-gray-700">{aiEnhancement.wineInfo.grapeVarieties || wine.mappedData.grapeVarieties || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-l-4 border-green-400 pl-3">
                      <h4 className="font-medium text-gray-900 mb-1">Region:</h4>
                      <p className="text-gray-700">{aiEnhancement.wineInfo.region || wine.mappedData.region || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="border-l-4 border-green-400 pl-3">
                    <h4 className="font-medium text-gray-900 mb-1">Sub-region:</h4>
                    <p className="text-gray-700">{aiEnhancement.wineInfo.subregion || wine.mappedData.subregion || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information Section */}
            {aiEnhancement?.additionalInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600">Will update</span>
                    <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-green-400 pl-3">
                    <h4 className="font-medium text-gray-900 mb-1">Tasting Notes:</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {aiEnhancement.additionalInfo.tastingNotes}
                    </p>
                  </div>

                  <div className="border-l-4 border-green-400 pl-3">
                    <h4 className="font-medium text-gray-900 mb-1">Cellaring:</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {aiEnhancement.additionalInfo.cellaring}
                    </p>
                  </div>

                  <div className="border-l-4 border-green-400 pl-3">
                    <h4 className="font-medium text-gray-900 mb-1">Food Pairings:</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {aiEnhancement.additionalInfo.foodPairings}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setAiRecommendationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  setIsEnhancing(true);
                  
                  const response = await fetch('/api/enhance-wine', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(wine.mappedData),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to enhance wine');
                  }

                  const enhancement = await response.json();
                  
                  // Apply AI enhancements to the wine data
                  const enhancedWine = {
                    ...wine,
                    mappedData: {
                      ...wine.mappedData,
                      drinkingWindowStart: enhancement.drinkingWindow.start,
                      drinkingWindowEnd: enhancement.drinkingWindow.end,
                      grapeVarieties: enhancement.wineInfo.grapeVarieties || wine.mappedData.grapeVarieties,
                      region: enhancement.wineInfo.region || wine.mappedData.region,
                      subregion: enhancement.wineInfo.subregion || wine.mappedData.subregion,
                      notes: enhancement.additionalInfo.tastingNotes + '\n\nCellaring: ' + enhancement.additionalInfo.cellaring + '\n\nFood Pairings: ' + enhancement.additionalInfo.foodPairings,
                    },
                    aiEnhancement: enhancement
                  };

                  onApprove(enhancedWine);
                  setAiRecommendationDialogOpen(false);
                  
                  toast({
                    title: "AI enhancements applied",
                    description: "Wine has been enhanced with AI recommendations and added to your collection.",
                  });
                } catch (error) {
                  console.error('Enhancement error:', error);
                  toast({
                    title: "Enhancement failed",
                    description: error.message,
                    variant: "destructive",
                  });
                } finally {
                  setIsEnhancing(false);
                }
              }}
              disabled={isEnhancing}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isEnhancing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enhancing...
                </>
              ) : (
                "Apply Enhancements & Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}