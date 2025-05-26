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
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {formatVintage(wine.mappedData.vintage)} {wine.mappedData.producer} {wine.mappedData.name}
              {wine.isPotentialDuplicate && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </h3>
            {wine.mappedData.region && (
              <p className="text-sm text-gray-600 mt-1">{wine.mappedData.region}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getConfidenceColor(wine.confidence)}>
              {wine.confidence} confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Auto-identified section */}
        {wine.mappedData.region && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-identified:</span>
            <Badge variant="secondary" className="text-xs">
              {wine.mappedData.region}
            </Badge>
          </div>
        )}

        {/* Wine Details Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Wine Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grape(s):</span>
                <span>{wine.mappedData.grapeVarieties || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vineyard:</span>
                <span>{wine.mappedData.vineyard || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subregion:</span>
                <span>{wine.mappedData.subregion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bottle Size:</span>
                <span>{wine.mappedData.bottleSize || '750ml'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity:</span>
                <span>{wine.mappedData.quantity || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span>{formatPrice(wine.mappedData.purchasePrice) || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{wine.mappedData.purchaseDate ? formatDate(wine.mappedData.purchaseDate) : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span>{wine.mappedData.storageLocation || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drinking Window Section */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Drinking Window</h4>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Suggested:</span>
                <div className="flex items-center gap-2">
                  <span>
                    {wine.aiDrinkingWindowRecommendation.start} - {wine.aiDrinkingWindowRecommendation.end}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      wine.aiDrinkingWindowRecommendation.confidence === 'high' 
                        ? 'border-green-300 text-green-700' 
                        : wine.aiDrinkingWindowRecommendation.confidence === 'medium'
                        ? 'border-yellow-300 text-yellow-700'
                        : 'border-red-300 text-red-700'
                    }`}
                  >
                    {wine.aiDrinkingWindowRecommendation.confidence}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* Verification Notice */}
        {wine.needsVerification && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Needs verification</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              This wine information needs manual verification before import.
            </p>
          </div>
        )}

        {wine.missingRequiredFields.length > 0 && (
          <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-1">Missing required fields:</h4>
            <ul className="list-disc list-inside text-sm text-red-700">
              {wine.missingRequiredFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(wine)}
                className="h-8"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-8"
            >
              View Details
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(wine)}
              className="h-8 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Skip
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => onApprove(wine)}
              className="h-8 bg-green-600 hover:bg-green-700"
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
    </Card>
  );
}