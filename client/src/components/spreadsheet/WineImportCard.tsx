import { useState } from 'react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Wine, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';

// Interface for the wine data
interface WineImportCardProps {
  wine: {
    rowIndex: number;
    originalData: Record<string, any>;
    mappedData: any;
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
  };
  viewMode: 'interpreted' | 'original';
}

export default function WineImportCard({ wine, viewMode }: WineImportCardProps) {
  const [expanded, setExpanded] = useState(wine.needsVerification);
  
  // Format the wine information for display
  const formatWineInfo = () => {
    const { mappedData } = wine;
    
    const vintage = mappedData.vintage === 0 ? 'NV' : mappedData.vintage;
    const producer = mappedData.producer || '';
    const name = mappedData.name || '';
    const type = mappedData.type || '';
    const region = mappedData.region ? `, ${mappedData.region}` : '';
    
    return {
      title: `${vintage} ${producer} ${name}`.trim(),
      subtitle: `${type}${region}`.trim()
    };
  };
  
  const { title, subtitle } = formatWineInfo();
  
  // Determine the card status coloring
  const getCardStatus = () => {
    if (wine.isPotentialDuplicate) {
      return {
        borderColor: 'border-blue-200',
        icon: <ShieldAlert className="text-blue-500 h-5 w-5" />,
        text: 'Potential Duplicate',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50'
      };
    }
    
    if (wine.needsVerification) {
      return {
        borderColor: 'border-yellow-200',
        icon: <AlertCircle className="text-yellow-500 h-5 w-5" />,
        text: 'Needs Verification',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50'
      };
    }
    
    return {
      borderColor: 'border-green-200',
      icon: <CheckCircle2 className="text-green-500 h-5 w-5" />,
      text: 'Ready to Import',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50'
    };
  };
  
  const status = getCardStatus();
  
  // Format drinking window display
  const formatDrinkingWindow = () => {
    const { mappedData } = wine;
    
    if (mappedData.drinkingWindowStart || mappedData.drinkingWindowEnd) {
      const start = mappedData.drinkingWindowStart ? new Date(mappedData.drinkingWindowStart).getFullYear() : 'Now';
      const end = mappedData.drinkingWindowEnd ? new Date(mappedData.drinkingWindowEnd).getFullYear() : 'Unknown';
      
      return `${start} - ${end}`;
    }
    
    if (wine.aiDrinkingWindowRecommendation?.start || wine.aiDrinkingWindowRecommendation?.end) {
      const start = wine.aiDrinkingWindowRecommendation.start || 'Now';
      const end = wine.aiDrinkingWindowRecommendation.end || 'Unknown';
      
      return (
        <span className="flex items-center">
          <Wine className="text-purple-500 h-4 w-4 mr-1" />
          {start} - {end} (AI Recommended)
        </span>
      );
    }
    
    return 'Not specified';
  };
  
  return (
    <Card className={`overflow-hidden border-l-4 ${status.borderColor}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <Badge variant="outline" className={`flex items-center ${status.bgColor} ${status.textColor} border-0`}>
            {status.icon}
            <span className="ml-1">{status.text}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Quantity</div>
            <div>{wine.mappedData.quantity || 1}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Storage</div>
            <div>{wine.storageLocation || 'Main Cellar'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Purchase Price</div>
            <div>
              {wine.mappedData.purchasePrice 
                ? `$${wine.mappedData.purchasePrice.toFixed(2)}` 
                : 'Not specified'}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Drinking Window</div>
            <div>{formatDrinkingWindow()}</div>
          </div>
        </div>
        
        {wine.missingRequiredFields.length > 0 && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center text-yellow-700 text-sm font-medium">
              <AlertCircle className="h-4 w-4 mr-1" />
              Missing required fields: {wine.missingRequiredFields.join(', ')}
            </div>
          </div>
        )}
        
        {wine.isPotentialDuplicate && (
          <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center text-blue-700 text-sm font-medium">
              <ShieldAlert className="h-4 w-4 mr-1" />
              Potential duplicate of wine ID: {wine.duplicateId}
            </div>
          </div>
        )}
        
        <Accordion type="single" collapsible className="mt-4" value={expanded ? 'details' : ''} onValueChange={(val) => setExpanded(val === 'details')}>
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2">
              {viewMode === 'interpreted' ? 'Interpreted Data' : 'Original Data'}
            </AccordionTrigger>
            <AccordionContent>
              {viewMode === 'interpreted' ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(wine.mappedData).map(([key, value]) => {
                    if (key === 'userId') return null;
                    
                    // Format the value for display
                    let displayValue: string | React.ReactNode = '';
                    
                    if (value === null || value === undefined) {
                      displayValue = '-';
                    } else if (key.includes('date') || key.includes('window')) {
                      displayValue = value ? formatDate(new Date(value as string)) : '-';
                    } else if (typeof value === 'boolean') {
                      displayValue = value ? 'Yes' : 'No';
                    } else {
                      displayValue = String(value);
                    }
                    
                    return (
                      <div key={key} className="py-1">
                        <div className="text-gray-500 font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                        <div>{displayValue}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(wine.originalData).map(([key, value]) => (
                    <div key={key} className="py-1">
                      <div className="text-gray-500 font-medium">{key}</div>
                      <div>{value !== null && value !== undefined ? String(value) : '-'}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {wine.aiDrinkingWindowRecommendation && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="text-purple-700 text-sm font-medium flex items-center mb-2">
                    <Wine className="h-4 w-4 mr-1" />
                    AI Drinking Window Recommendation
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">Recommendation: {wine.aiDrinkingWindowRecommendation.start || 'Now'} - {wine.aiDrinkingWindowRecommendation.end || 'Unknown'}</div>
                    <div className="text-gray-600 mt-1">{wine.aiDrinkingWindowRecommendation.reasoning}</div>
                    <div className="mt-2 flex items-center">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${
                          wine.aiDrinkingWindowRecommendation.confidence === 'high' 
                            ? 'bg-green-50 text-green-700' 
                            : wine.aiDrinkingWindowRecommendation.confidence === 'medium'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {wine.aiDrinkingWindowRecommendation.confidence}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}