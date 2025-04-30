import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from '@/components/ui/dialog-confirm';

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
  aiDrinkingWindowRecommendation?: {
    start?: string;
    end?: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  };
}

interface WineImportCardProps {
  wine: WineData;
  onApprove: (wine: WineData, useAiRecommendation?: boolean) => void;
  onReject: (wine: WineData) => void;
  onEdit: (wine: WineData) => void;
  editable?: boolean;
}

const WineImportCard: React.FC<WineImportCardProps> = ({
  wine,
  onApprove,
  onReject,
  onEdit,
  editable = true
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiRecommendationDialogOpen, setAiRecommendationDialogOpen] = useState(false);

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      // If dateString is already in YYYY-MM-DD format, return it
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
      
      // Otherwise try to convert it to a date
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Card className={`mb-4 ${wine.needsVerification ? 'border-amber-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {wine.mappedData.vintage && wine.mappedData.vintage !== 'NV' 
                ? wine.mappedData.vintage 
                : wine.mappedData.vintage === 'NV' 
                  ? 'NV'
                  : 'Unknown Vintage'} {wine.mappedData.producer || 'Unknown Producer'} {wine.mappedData.name || 'Unknown Wine'}
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {wine.mappedData.type || 'Unknown Type'} {wine.mappedData.region ? `• ${wine.mappedData.region}` : ''}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getConfidenceBadgeColor(wine.confidence)}>
              {wine.confidence.charAt(0).toUpperCase() + wine.confidence.slice(1)} confidence
            </Badge>
            {wine.isPotentialDuplicate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Potential duplicate
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This wine may already exist in your collection (ID: {wine.duplicateId})</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Wine Details</h4>
            <div className="space-y-1 text-sm">
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Grape(s):</span>
                <span className="col-span-2">{wine.mappedData.grapeVarieties || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Vineyard:</span>
                <span className="col-span-2">{wine.mappedData.vineyard || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Subregion:</span>
                <span className="col-span-2">{wine.mappedData.subregion || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Bottle Size:</span>
                <span className="col-span-2">{wine.mappedData.bottleSize || '750ml'}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Purchase Information</h4>
            <div className="space-y-1 text-sm">
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="col-span-2">{wine.mappedData.quantity || 1}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Price:</span>
                <span className="col-span-2">
                  {typeof wine.mappedData.purchasePrice === 'number' 
                    ? `$${wine.mappedData.purchasePrice.toFixed(2)}` 
                    : 'Unknown'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Date:</span>
                <span className="col-span-2">{formatDate(wine.mappedData.purchaseDate)}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-muted-foreground">Location:</span>
                <span className="col-span-2">{wine.mappedData.purchaseLocation || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Drinking Window</h4>
          <div className="space-y-1 text-sm">
            <div className="grid grid-cols-6 gap-1">
              <span className="text-muted-foreground col-span-2">Current:</span>
              <span className="col-span-4">
                {formatDate(wine.mappedData.drinkingWindowStart)} - {formatDate(wine.mappedData.drinkingWindowEnd)}
              </span>
            </div>
            
            {wine.aiDrinkingWindowRecommendation && (
              <div className="grid grid-cols-6 gap-1">
                <span className="text-muted-foreground col-span-2">AI Suggested:</span>
                <div className="col-span-4 flex items-center">
                  <span>
                    {formatDate(wine.aiDrinkingWindowRecommendation.start)} - {formatDate(wine.aiDrinkingWindowRecommendation.end)}
                  </span>
                  <Badge className={`ml-2 ${getConfidenceBadgeColor(wine.aiDrinkingWindowRecommendation.confidence)}`}>
                    {wine.aiDrinkingWindowRecommendation.confidence}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2 h-6 px-2"
                    onClick={() => setAiRecommendationDialogOpen(true)}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View AI recommendation reasoning</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

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

        {wine.needsVerification && (
          <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <h4 className="text-sm font-medium text-amber-800 mb-1">Needs verification</h4>
            <p className="text-sm text-amber-700">
              This wine information needs manual verification before import.
            </p>
          </div>
        )}
      </CardContent>
      
      {editable && (
        <CardFooter className="pt-2 flex justify-between">
          <div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mr-2"
              onClick={() => onEdit(wine)}
            >
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
          <div>
            <Button 
              variant="destructive" 
              size="sm" 
              className="mr-2"
              onClick={() => setDialogOpen(true)}
            >
              <X className="mr-1 h-4 w-4" />
              Skip
            </Button>
            {wine.aiDrinkingWindowRecommendation ? (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onApprove(wine)}
              >
                <Check className="mr-1 h-4 w-4" />
                Import as is
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onApprove(wine)}
              >
                <Check className="mr-1 h-4 w-4" />
                Import
              </Button>
            )}
          </div>
        </CardFooter>
      )}

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Skip this wine?"
        description="Are you sure you want to skip importing this wine? This action cannot be undone."
        confirmText="Skip"
        cancelText="Cancel"
        onConfirm={() => {
          onReject(wine);
          setDialogOpen(false);
        }}
      />

      {wine.aiDrinkingWindowRecommendation && (
        <ConfirmDialog
          open={aiRecommendationDialogOpen}
          onOpenChange={setAiRecommendationDialogOpen}
          title="AI Drinking Window Recommendation"
          description={
            <div className="space-y-2">
              <p>Suggested drinking window: {formatDate(wine.aiDrinkingWindowRecommendation.start)} - {formatDate(wine.aiDrinkingWindowRecommendation.end)}</p>
              <p className="text-sm">{wine.aiDrinkingWindowRecommendation.reasoning}</p>
              <p className="text-sm font-medium mt-4">Would you like to use this AI-recommended drinking window?</p>
            </div>
          }
          confirmText="Use AI Recommendation"
          cancelText="Keep Original"
          onConfirm={() => {
            onApprove(wine, true);
            setAiRecommendationDialogOpen(false);
          }}
        />
      )}
    </Card>
  );
};

export default WineImportCard;