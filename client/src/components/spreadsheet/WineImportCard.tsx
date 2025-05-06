import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, AlertCircle, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from '@/components/ui/dialog-confirm';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { extractGrapeVarieties, extractVineyard } from '@/lib/wineUtils';

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

const WineImportCard: React.FC<WineImportCardProps> = ({
  wine,
  onApprove,
  onReject,
  onEdit,
  editable = true,
  allProcessedWines = [],
  setAllProcessedWines,
  selectable = false,
  isSelected = false,
  onSelect
}) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiRecommendationDialogOpen, setAiRecommendationDialogOpen] = useState(false);
  
  // Extract grape varieties and vineyard from wine name when editing
  useEffect(() => {
    if (setAllProcessedWines && wine.mappedData.name) {
      // Only extract if fields are empty
      const extractedGrapes = wine.mappedData.grapeVarieties ? null : extractGrapeVarieties(wine.mappedData.name);
      const extractedVineyard = wine.mappedData.vineyard ? null : extractVineyard(wine.mappedData.name);
      
      // If we found either grapes or vineyard, update the wine data
      if (extractedGrapes || extractedVineyard) {
        const updatedWine: WineData = {
          ...wine,
          mappedData: {
            ...wine.mappedData,
            grapeVarieties: extractedGrapes || wine.mappedData.grapeVarieties,
            vineyard: extractedVineyard || wine.mappedData.vineyard
          }
        };
        
        // Update the wine in the list
        const wineIndex = allProcessedWines.findIndex((w: WineData) => w.rowIndex === wine.rowIndex);
        if (wineIndex !== -1) {
          const newProcessedWines = [...allProcessedWines];
          newProcessedWines[wineIndex] = updatedWine;
          setAllProcessedWines(newProcessedWines);
        }
      }
    }
  }, [wine.mappedData.name, setAllProcessedWines]);

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
      // For drinking windows, we just want to show the year
      if (/^\d{4}$/.test(dateString)) return dateString;
      
      // If dateString is already in YYYY-MM-DD format, extract just the year
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString.substring(0, 4);
      
      // Otherwise try to convert it to a date and extract the year
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch (e) {
      return 'Not set';
    }
  };

  return (
    <Card className={`mb-4 ${wine.needsVerification ? 'border-amber-500' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            {selectable && (
              <div className="mt-1.5">
                <Checkbox 
                  checked={isSelected} 
                  onCheckedChange={() => onSelect && onSelect(wine.rowIndex)} 
                  id={`select-wine-${wine.rowIndex}`}
                />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">
                {/* Display vintage */}
                {wine.mappedData.vintage && wine.mappedData.vintage !== 'NV' 
                  ? wine.mappedData.vintage 
                  : wine.mappedData.vintage === 'NV' 
                    ? 'NV'
                    : 'Unknown Vintage'}
                {/* Display producer */}
                {' '}{wine.mappedData.producer || 'Unknown Producer'}
                {/* Always display the name if it exists, even if it's similar to producer */}
                {wine.mappedData.name && ` ${wine.mappedData.name}`}
              </CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                {wine.mappedData.type || 'Unknown Type'} {wine.mappedData.region ? `• ${wine.mappedData.region}` : ''}
              </div>
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
        {/* Auto-identification Alerts */}
        {wine.missingRequiredFields.includes('not_wine') && (
          <div className="bg-red-50 text-red-600 p-2 mb-4 rounded border border-red-200 text-sm">
            <AlertCircle className="h-4 w-4 inline-block mr-1" />
            This appears to be a non-wine beverage and may not belong in your collection.
          </div>
        )}
        
        {/* Identification Tags */}
        {(wine.mappedData.grapeVarieties || wine.mappedData.vineyard || wine.mappedData.region || wine.mappedData.subregion) && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Auto-identified:</p>
            <div className="flex flex-wrap gap-1.5">
              {wine.mappedData.grapeVarieties && (
                <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                  <span className="text-blue-600">Grapes:</span> {wine.mappedData.grapeVarieties}
                </Badge>
              )}
              {wine.mappedData.vineyard && (
                <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200">
                  <span className="text-emerald-600">Vineyard:</span> {wine.mappedData.vineyard}
                </Badge>
              )}
              {wine.mappedData.region && (
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                  <span className="text-purple-600">Region:</span> {wine.mappedData.region}
                </Badge>
              )}
              {wine.mappedData.subregion && (
                <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200">
                  <span className="text-indigo-600">Subregion:</span> {wine.mappedData.subregion}
                </Badge>
              )}
            </div>
          </div>
        )}
        
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
            
            {wine.aiDrinkingWindowRecommendation ? (
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
            ) : (
              wine.mappedData.vintage && wine.mappedData.vintage !== 'NV' && (
                <div className="grid grid-cols-6 gap-1">
                  <span className="text-muted-foreground col-span-2">AI Analysis:</span>
                  <div className="col-span-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={async () => {
                        try {
                          // Set up a temporary wine ID in the mapped data for the API call
                          // This is a workaround for imported wines that don't have an ID yet
                          const tempWineId = wine.rowIndex;
                          
                          toast({
                            title: "AI Wine Analysis in Progress",
                            description: "Analyzing wine details, determining optimal drinking window, and identifying characteristics..."
                          });
                          
                          // Call the new AI drinking window recommendation endpoint
                          const response = await apiRequest('POST', '/api/wine-drinking-window-recommendation', {
                            wineId: tempWineId,
                            wineData: wine.mappedData // Send the wine data directly since this is not yet in the database
                          });
                          
                          const data = await response.json();
                          
                          if (data.success && data.data) {
                            // Extract drinking window and additional information from comprehensive analysis
                            const { start, end, confidence, reasoning, grapeVarieties, region, subregion, notes, cellaring, pairings } = data.data;
                            
                            // Create updated wine object with the recommendation and additional info
                            const updatedWine: WineData = {
                              ...wine,
                              aiDrinkingWindowRecommendation: {
                                start: start?.toString() || '',
                                end: end?.toString() || '',
                                confidence: confidence || 'medium',
                                reasoning: reasoning || 'Based on wine characteristics.',
                                grapeVarieties,
                                region,
                                subregion,
                                notes,
                                cellaring,
                                pairings
                              }
                            };
                            
                            // Also update the mapped data with any new information
                            // Only update fields that are currently empty
                            const updatedMappedData = { ...updatedWine.mappedData };
                            
                            if (grapeVarieties && !updatedMappedData.grapeVarieties) {
                              updatedMappedData.grapeVarieties = grapeVarieties;
                            }
                            
                            if (region && !updatedMappedData.region) {
                              updatedMappedData.region = region;
                            }
                            
                            if (subregion && !updatedMappedData.subregion) {
                              updatedMappedData.subregion = subregion;
                            }
                            
                            // Include useful notes information if notes are empty
                            if ((notes || cellaring || pairings) && !updatedMappedData.notes) {
                              let combinedNotes = '';
                              if (notes) combinedNotes += notes + '\n\n';
                              if (cellaring) combinedNotes += 'Cellaring: ' + cellaring + '\n\n';
                              if (pairings) combinedNotes += 'Pairings: ' + pairings;
                              
                              updatedMappedData.notes = combinedNotes.trim();
                            }
                            
                            // Update the final wine object with the new mapped data
                            updatedWine.mappedData = updatedMappedData;
                            
                            // Update the wine in the parent component if setter is provided
                            if (setAllProcessedWines) {
                              const wineIndex = allProcessedWines.findIndex((w: WineData) => w.rowIndex === wine.rowIndex);
                              if (wineIndex !== -1) {
                                const newProcessedWines = [...allProcessedWines];
                                newProcessedWines[wineIndex] = updatedWine;
                                setAllProcessedWines(newProcessedWines);
                              }
                            }
                            
                            // Show the AI recommendation dialog
                            setAiRecommendationDialogOpen(true);
                          } else {
                            toast({
                              title: "AI Wine Analysis Failed",
                              description: data.message || "Could not analyze this wine. Please try again or enter information manually.",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          console.error('Error requesting AI wine analysis:', error);
                          toast({
                            title: "AI Wine Analysis Failed",
                            description: error instanceof Error ? error.message : "An unknown error occurred during wine analysis",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Analyze with AI
                    </Button>
                  </div>
                </div>
              )
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
          title="AI Wine Analysis"
          description={
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold mb-2">Drinking Window</h3>
                <p className="font-medium">Suggested drinking window: {formatDate(wine.aiDrinkingWindowRecommendation.start)} - {formatDate(wine.aiDrinkingWindowRecommendation.end)}</p>
                <p className="text-sm mt-1">{wine.aiDrinkingWindowRecommendation.reasoning}</p>
              </div>
              
              {(wine.aiDrinkingWindowRecommendation.grapeVarieties || wine.aiDrinkingWindowRecommendation.region || wine.aiDrinkingWindowRecommendation.subregion) && (
                <div>
                  <h3 className="text-base font-semibold mb-2">Wine Information</h3>
                  {wine.aiDrinkingWindowRecommendation.grapeVarieties && (
                    <div className="mb-1">
                      <span className="font-medium">Grape Varieties:</span> {wine.aiDrinkingWindowRecommendation.grapeVarieties}
                    </div>
                  )}
                  {wine.aiDrinkingWindowRecommendation.region && (
                    <div className="mb-1">
                      <span className="font-medium">Region:</span> {wine.aiDrinkingWindowRecommendation.region}
                    </div>
                  )}
                  {wine.aiDrinkingWindowRecommendation.subregion && (
                    <div className="mb-1">
                      <span className="font-medium">Subregion:</span> {wine.aiDrinkingWindowRecommendation.subregion}
                    </div>
                  )}
                </div>
              )}
              
              {(wine.aiDrinkingWindowRecommendation.notes || wine.aiDrinkingWindowRecommendation.cellaring || wine.aiDrinkingWindowRecommendation.pairings) && (
                <div>
                  <h3 className="text-base font-semibold mb-2">Tasting & Pairing</h3>
                  {wine.aiDrinkingWindowRecommendation.notes && (
                    <div className="mb-1">
                      <span className="font-medium">Characteristics:</span> {wine.aiDrinkingWindowRecommendation.notes}
                    </div>
                  )}
                  {wine.aiDrinkingWindowRecommendation.cellaring && (
                    <div className="mb-1">
                      <span className="font-medium">Cellaring:</span> {wine.aiDrinkingWindowRecommendation.cellaring}
                    </div>
                  )}
                  {wine.aiDrinkingWindowRecommendation.pairings && (
                    <div className="mb-1">
                      <span className="font-medium">Pairings:</span> {wine.aiDrinkingWindowRecommendation.pairings}
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-sm font-medium mt-2">Would you like to apply these AI recommendations to your wine?</p>
            </div>
          }
          confirmText="Apply All Recommendations"
          cancelText="Keep Original"
          onConfirm={() => {
            // This check was already done in the enclosing condition, but we add it here for type safety
            if (!wine.aiDrinkingWindowRecommendation) return;
            
            // Apply all the AI recommendations including drinking window and additional info
            const updatedMappedData = { ...wine.mappedData };
            
            // Apply drinking window
            updatedMappedData.drinkingWindowStart = wine.aiDrinkingWindowRecommendation.start || '';
            updatedMappedData.drinkingWindowEnd = wine.aiDrinkingWindowRecommendation.end || '';
            
            // Apply other fields if they were provided and current values are empty
            if (wine.aiDrinkingWindowRecommendation.grapeVarieties && !updatedMappedData.grapeVarieties) {
              updatedMappedData.grapeVarieties = wine.aiDrinkingWindowRecommendation.grapeVarieties;
            }
            
            if (wine.aiDrinkingWindowRecommendation.region && !updatedMappedData.region) {
              updatedMappedData.region = wine.aiDrinkingWindowRecommendation.region;
            }
            
            if (wine.aiDrinkingWindowRecommendation.subregion && !updatedMappedData.subregion) {
              updatedMappedData.subregion = wine.aiDrinkingWindowRecommendation.subregion;
            }
            
            // Combine notes information if it exists and current notes are empty
            if (!updatedMappedData.notes) {
              let combinedNotes = '';
              
              if (wine.aiDrinkingWindowRecommendation.notes) {
                combinedNotes += wine.aiDrinkingWindowRecommendation.notes + '\n\n';
              }
              
              if (wine.aiDrinkingWindowRecommendation.cellaring) {
                combinedNotes += 'Cellaring: ' + wine.aiDrinkingWindowRecommendation.cellaring + '\n\n';
              }
              
              if (wine.aiDrinkingWindowRecommendation.pairings) {
                combinedNotes += 'Pairings: ' + wine.aiDrinkingWindowRecommendation.pairings;
              }
              
              if (combinedNotes) {
                updatedMappedData.notes = combinedNotes.trim();
              }
            }
            
            const updatedWine: WineData = {
              ...wine,
              mappedData: updatedMappedData
            };
            
            // Update the wine in the allProcessedWines array if setAllProcessedWines was provided
            if (setAllProcessedWines) {
              const wineIndex = allProcessedWines.findIndex((w: WineData) => w.rowIndex === wine.rowIndex);
              if (wineIndex !== -1) {
                const newProcessedWines = [...allProcessedWines];
                newProcessedWines[wineIndex] = updatedWine;
                setAllProcessedWines(newProcessedWines);
              }
            }
            
            const start = wine.aiDrinkingWindowRecommendation.start || 'not set';
            const end = wine.aiDrinkingWindowRecommendation.end || 'not set';
            
            toast({
              title: "AI Wine Analysis Applied",
              description: `Wine information has been enhanced with AI analysis results`,
            });
            
            setAiRecommendationDialogOpen(false);
          }}
        />
      )}
    </Card>
  );
};

export default WineImportCard;