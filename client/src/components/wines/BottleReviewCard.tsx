import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle } from "lucide-react";

interface WineBottleData {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  grapeVarieties: string | null;
  type: string | null;
}

interface BottleReviewCardProps {
  wine: WineBottleData;
  confidence: number;
  onConfirm: () => void;
  onSkip: () => void;
  isPossibleDuplicate?: boolean;
}

const BottleReviewCard: React.FC<BottleReviewCardProps> = ({
  wine,
  confidence,
  onConfirm,
  onSkip,
  isPossibleDuplicate = false
}) => {
  // Format confidence for display
  const formattedConfidence = 
    confidence >= 0.8 ? 'high' : 
    confidence >= 0.5 ? 'medium' : 'low';
  
  const confidenceBadgeColor = 
    formattedConfidence === 'high' ? 'bg-green-100 text-green-800' :
    formattedConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
    'bg-red-100 text-red-800';

  return (
    <Card className="mb-4">
      <CardContent className="pt-6 space-y-4">
        {/* Wine Title */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium">
              {/* Display vintage */}
              {wine.vintage ? wine.vintage : 'Unknown Vintage'}
              {/* Display producer */}
              {' '}{wine.producer || 'Unknown Producer'}
              {/* Display name if exists */}
              {wine.name && ` ${wine.name}`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {wine.type || 'Unknown Type'} {wine.region ? `• ${wine.region}` : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={confidenceBadgeColor}>
              {formattedConfidence.charAt(0).toUpperCase() + formattedConfidence.slice(1)} confidence
            </Badge>
          </div>
        </div>
        
        {/* Duplicate Warning */}
        {isPossibleDuplicate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Possible Duplicate</p>
                <p className="text-yellow-700">
                  This wine may already exist in your collection.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Wine Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Wine Details</h4>
            <div className="space-y-1 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Grape(s):</span>
                <span>{wine.grapeVarieties || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Region:</span>
                <span>{wine.region || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Subregion:</span>
                <span>{wine.subregion || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Country:</span>
                <span>{wine.country || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          className="flex-1 mr-2 border-red-200 text-red-700 hover:bg-red-50"
          onClick={onSkip}
        >
          <X className="mr-2 h-4 w-4" />
          Skip
        </Button>
        <Button 
          variant="default" 
          className="flex-1 bg-burgundy-600 hover:bg-burgundy-700 text-white"
          onClick={onConfirm}
        >
          <Check className="mr-2 h-4 w-4" />
          Confirm
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BottleReviewCard;