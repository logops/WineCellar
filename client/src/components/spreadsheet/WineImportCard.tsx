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

export function WineImportCard({ 
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
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            {wine.mappedData.type && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Type:</span>
                <span className="col-span-4">{wine.mappedData.type}</span>
              </div>
            )}
            {wine.mappedData.grapeVarieties && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Grapes:</span>
                <span className="col-span-4">{wine.mappedData.grapeVarieties}</span>
              </div>
            )}
            {wine.mappedData.quantity && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Quantity:</span>
                <span className="col-span-4">{wine.mappedData.quantity}</span>
              </div>
            )}
            {wine.mappedData.storageLocation && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Location:</span>
                <span className="col-span-4">{wine.mappedData.storageLocation}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {wine.mappedData.purchasePrice && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Paid:</span>
                <span className="col-span-4">{formatPrice(wine.mappedData.purchasePrice)}</span>
              </div>
            )}
            {wine.mappedData.currentValue && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Value:</span>
                <span className="col-span-4">{formatPrice(wine.mappedData.currentValue)}</span>
              </div>
            )}
            {wine.mappedData.purchaseDate && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Purchased:</span>
                <span className="col-span-4">{formatDate(wine.mappedData.purchaseDate)}</span>
              </div>
            )}
            {wine.mappedData.drinkingWindowStart && wine.mappedData.drinkingWindowEnd && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">Drink:</span>
                <span className="col-span-4">
                  {wine.mappedData.drinkingWindowStart} - {wine.mappedData.drinkingWindowEnd}
                </span>
              </div>
            )}
          </div>
        </div>

        {wine.lwinMatches && wine.lwinMatches.matches.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-800">LWIN Database Matches</h4>
              <span className="text-xs text-blue-600">
                {wine.lwinMatches.matches.length} match{wine.lwinMatches.matches.length !== 1 ? 'es' : ''} found
              </span>
            </div>
            <div className="space-y-2">
              {wine.lwinMatches.matches.slice(0, 3).map((match, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {match.vintage && `${match.vintage} `}{match.producer} {match.wineName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {match.region && `${match.region}`}{match.country && ` • ${match.country}`}
                      {match.type && ` • ${match.type}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {Math.round(match.confidence * 100)}% match
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => {
                        if (allProcessedWines && setAllProcessedWines) {
                          const updatedWine = {
                            ...wine,
                            mappedData: {
                              ...wine.mappedData,
                              producer: match.producer,
                              name: match.wineName,
                              vintage: match.vintage || wine.mappedData.vintage,
                              region: match.region || wine.mappedData.region,
                              type: match.type || wine.mappedData.type,
                            },
                            confidence: 'high' as const,
                          };
                          
                          const wineIndex = allProcessedWines.findIndex((w) => w.rowIndex === wine.rowIndex);
                          if (wineIndex !== -1) {
                            const newWines = [...allProcessedWines];
                            newWines[wineIndex] = updatedWine;
                            setAllProcessedWines(newWines);
                          }
                        }
                      }}
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
              className="h-8"
            >
              <Check className="h-4 w-4 mr-1" />
              Add to Collection
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