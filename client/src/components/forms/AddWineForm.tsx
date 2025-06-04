import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Wine, Loader2, Sparkles, Upload, Receipt } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAutocompleteSuggestions } from "@/lib/autocompleteService";
import { extractGrapeVarieties, extractVineyard, lookupWineInformation } from "@/lib/wineUtils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { WineLabelRecognition } from "@/components/wines/WineLabelRecognition";
import { MultiBottleWizard } from "@/components/wines/MultiBottleWizard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Wine as WineSchema, insertWineSchema } from "@shared/schema";
import { Autocomplete } from "@/components/ui/autocomplete";
import StorageLocationField from "./StorageLocationField";

const formSchema = insertWineSchema.extend({
  // Updated to accept 0 (non-vintage) or year between 1900 and current year + 10
  vintage: z.coerce.number()
    .refine(val => val === 0 || (val >= 1900 && val <= new Date().getFullYear() + 10), {
      message: "Enter a valid vintage year or 0 for non-vintage wines"
    })
    .optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  currentValue: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(1).default(1),
  // Add year fields for custom drinking window
  drinkingWindowStartYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 50).optional(),
  drinkingWindowEndYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 50).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddWineFormProps {
  wine?: WineSchema;
  onSuccess?: () => void;
  onFormChange?: (isDirty: boolean) => void;
}

interface RecommendedDrinkingWindow {
  startYear: number;
  endYear: number;
  notes: string;
  isPastPrime: boolean;
}

interface TastingProfile {
  characteristics: string | null;
  ageability: string | null;
  maturity: string | null;
}

interface ProductionDetails {
  winemaking: string | null;
  terroir: string | null;
  classification: string | null;
}

interface WineRating {
  score: number | null;
  confidenceLevel: string;
}

interface ComprehensiveWineData {
  tasting?: TastingProfile;
  foodPairings?: string | null;
  servingSuggestions?: string | null;
  productionDetails?: ProductionDetails;
  rating?: WineRating;
}

export default function AddWineForm({ wine, onSuccess, onFormChange }: AddWineFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryMethod, setEntryMethod] = useState("manual");
  const [drinkingWindowType, setDrinkingWindowType] = useState(
    wine?.drinkingStatus || "drink_later"
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDrinkDialog, setShowDrinkDialog] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [recommendedDrinkingWindow, setRecommendedDrinkingWindow] = useState<RecommendedDrinkingWindow | null>(null);
  const [originalPrediction, setOriginalPrediction] = useState<any>(null);
  const [isLookingUpWineInfo, setIsLookingUpWineInfo] = useState(false);
  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [wineInfoResult, setWineInfoResult] = useState<{ grapeVarieties?: string; vineyard?: string; confidence?: string; } | null>(null);
  const [comprehensiveWineData, setComprehensiveWineData] = useState<ComprehensiveWineData | null>(null);
  const [showMultiBottleWizard, setShowMultiBottleWizard] = useState(false);
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const [aiEnhancementResult, setAiEnhancementResult] = useState<WineAnalysisResponse["data"] | null>(null);
  const [multiBottleData, setMultiBottleData] = useState<any>(null);
  // Track which fields were enhanced and show visual feedback
  const [enhancedFields, setEnhancedFields] = useState<string[]>([]);
  const [showEnhancedFields, setShowEnhancedFields] = useState(false);
  // Receipt upload functionality
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [parsedReceiptWines, setParsedReceiptWines] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentReceiptWineIndex, setCurrentReceiptWineIndex] = useState(0);
  const [isProcessingReceiptWine, setIsProcessingReceiptWine] = useState(false);
  
  // Fetch wines for duplicate detection in multi-bottle recognition
  const { data: existingWines = [] } = useQuery({
    queryKey: ['/api/wines', 'in_cellar'],
    queryFn: async () => {
      const response = await fetch('/api/wines?consumedStatus=in_cellar', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Get autocomplete suggestions
  const suggestions = useAutocompleteSuggestions();

  // Convert dates from strings to Date objects if needed
  // Extract year from date for drinking window if available
  const drinkingWindowStartYear = wine?.drinkingWindowStart 
    ? new Date(wine.drinkingWindowStart).getFullYear() 
    : undefined;
  
  const drinkingWindowEndYear = wine?.drinkingWindowEnd 
    ? new Date(wine.drinkingWindowEnd).getFullYear() 
    : undefined;

  const defaultValues: Partial<FormValues> = {
    name: wine?.name || "",
    producer: wine?.producer || "",
    vintage: wine?.vintage || undefined,
    vineyard: wine?.vineyard || "",
    type: wine?.type || "red",
    region: wine?.region || "",
    subregion: wine?.subregion || "",
    grapeVarieties: wine?.grapeVarieties || "",
    bottleSize: wine?.bottleSize || "750ml",
    quantity: wine?.quantity || 1,
    purchasePrice: wine?.purchasePrice || undefined,
    currentValue: wine?.currentValue || undefined,
    purchaseLocation: wine?.purchaseLocation || "",
    notes: wine?.notes || "",
    drinkingWindowStartYear,
    drinkingWindowEndYear,
    storageLocation: wine?.storageLocation || "Main Cellar",
    binNumber: wine?.binNumber || "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Track changes to form values using a more direct approach
  useEffect(() => {
    // Set up subscription to watch for changes in real-time
    const subscription = form.watch((value, { name, type }) => {
      // This will trigger on every field change
      console.log("Form field changed:", name, type);
      
      // Get current form values
      const currentValues = form.getValues();
      
      // Auto-extract grape varieties and vineyard information from wine name if those fields are empty
      if (name === 'name') {
        const wineName = currentValues.name;
        
        if (wineName) {
          // Only extract grape varieties if the field is currently empty
          const currentGrapes = currentValues.grapeVarieties;
          if (!currentGrapes || (typeof currentGrapes === 'string' && currentGrapes.trim() === '')) {
            const extractedGrapes = extractGrapeVarieties(wineName);
            if (extractedGrapes) {
              form.setValue('grapeVarieties', extractedGrapes, { shouldDirty: true });
            }
          }
          
          // Only extract vineyard if the field is currently empty
          const currentVineyard = currentValues.vineyard;
          if (!currentVineyard || currentVineyard.trim() === '') {
            const extractedVineyard = extractVineyard(wineName);
            if (extractedVineyard) {
              form.setValue('vineyard', extractedVineyard, { shouldDirty: true });
            }
          }
        }
      }
      
      // Use both approaches to determine if form is dirty
      // 1. Manual check comparing current values with defaults
      let manuallyDetectedDirty = false;
      
      // Check each field for changes
      Object.keys(defaultValues).forEach(key => {
        const fieldKey = key as keyof typeof defaultValues;
        const defaultVal = defaultValues[fieldKey];
        const currentVal = currentValues[fieldKey as keyof FormValues];
        
        // Check if values are different
        if (currentVal !== defaultVal && 
            // Handle special case for empty strings vs undefined/null
            !(
              (currentVal === "" && (defaultVal === undefined || defaultVal === null)) ||
              (defaultVal === "" && (currentVal === undefined || currentVal === null))
            )
           ) {
          manuallyDetectedDirty = true;
        }
      });
      
      // 2. Also check React Hook Form's own dirty tracking
      const formStateDirty = form.formState.isDirty;
      
      // Use either detection method - if either says it's dirty, treat as dirty
      const isDirty = manuallyDetectedDirty || formStateDirty;
      
      console.log("Form dirty state check:", {
        manuallyDetectedDirty,
        formStateDirty,
        combinedResult: isDirty
      });
      
      // Update local state and notify parent
      setFormDirty(isDirty);
      if (onFormChange) {
        onFormChange(isDirty);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, defaultValues, onFormChange]);

  // Function to handle receipt file processing
  const processReceiptFile = async (file: File) => {
    setReceiptFile(file);
    setIsParsingReceipt(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to parse receipt');
      }

      const data = await response.json();
      setParsedReceiptWines(data.wines || []);
      
      if (data.wines && data.wines.length > 0) {
        toast({
          title: "Receipt Parsed",
          description: `Found ${data.wines.length} wine${data.wines.length !== 1 ? 's' : ''} in the receipt.`,
        });
        setShowReceiptUpload(true);
      } else {
        toast({
          title: "No Wines Found",
          description: "No wine items were found in this receipt.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Receipt parsing error:', error);
      toast({
        title: "Error",
        description: "Failed to parse receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsParsingReceipt(false);
    }
  };

  // Function to handle receipt upload from input
  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processReceiptFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (imageFile) {
      await processReceiptFile(imageFile);
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image or PDF file.",
        variant: "destructive",
      });
    }
  };

  // Function to add wine from parsed receipt (similar to label capture flow)
  const addWineFromReceipt = (receiptWine: any, wineIndex?: number) => {
    setIsProcessingReceiptWine(true);
    
    // Handle drinking window if provided by AI enhancement
    let drinkingWindowStart = null;
    let drinkingWindowEnd = null;
    let drinkingStatus = 'drink_later';
    
    if (receiptWine.drinkingWindowStart && receiptWine.drinkingWindowEnd) {
      drinkingWindowStart = parseInt(receiptWine.drinkingWindowStart);
      drinkingWindowEnd = parseInt(receiptWine.drinkingWindowEnd);
      drinkingStatus = 'custom';
    }

    form.reset({
      name: receiptWine.name || '',
      producer: receiptWine.producer || '',
      vintage: receiptWine.vintage || '',
      type: receiptWine.type?.toLowerCase() || 'red',
      grapeVarieties: receiptWine.grapeVarieties || '',
      region: receiptWine.region || '',
      subregion: receiptWine.subregion || '',
      vineyard: receiptWine.vineyard || '',
      quantity: receiptWine.isDuplicate ? receiptWine.quantity + 1 : receiptWine.quantity || 1,
      purchasePrice: receiptWine.price || '',
      purchaseDate: receiptWine.purchaseDate || format(new Date(), "yyyy-MM-dd"),
      purchaseLocation: receiptWine.purchaseLocation || '',
      bottleSize: receiptWine.bottleSize || '750ml',
      storageLocation: 'Main Cellar',
      drinkingStatus: drinkingStatus,
      drinkingWindowStartYear: drinkingWindowStart ?? undefined,
      drinkingWindowEndYear: drinkingWindowEnd ?? undefined,
      notes: receiptWine.notes || ''
    });
    
    // Set drinking window type if AI provided recommendations
    if (drinkingWindowStart && drinkingWindowEnd) {
      setDrinkingWindowType('custom');
    }
    
    // Store the current wine index for multi-wine processing
    if (typeof wineIndex === 'number') {
      setCurrentReceiptWineIndex(wineIndex);
    }
    
    setEntryMethod("manual");
    setShowReceiptUpload(false);
    setIsProcessingReceiptWine(false);
    
    const description = receiptWine.aiEnhanced 
      ? "Wine information loaded with AI enhancements. Review the details before saving."
      : "Wine information loaded from receipt. Review and modify the details before saving.";
    
    toast({
      title: "Wine Information Loaded",
      description: description,
    });
  };

  // Function to handle consumption of wine
  async function handleDrinkWine() {
    if (!wine?.id) return;
    
    setIsSubmitting(true);
    try {
      // Create consumption record
      await apiRequest("POST", "/api/consumptions", {
        wineId: wine.id,
        consumptionDate: new Date(),
        quantity: 1,
        notes: "Consumed from edit screen",
      });
      
      // Also update the wine status to indicate it's been consumed if quantity becomes 0
      if ((wine.quantity ?? 0) <= 1) {
        await apiRequest("PATCH", `/api/wines/${wine.id}`, {
          ...wine,
          quantity: 0,
          consumedStatus: 'consumed', // Add flag to mark as consumed
        });
      } else {
        // Just reduce the quantity by 1
        await apiRequest("PATCH", `/api/wines/${wine.id}`, {
          ...wine,
          quantity: (wine.quantity ?? 1) - 1,
        });
      }

      toast({
        title: "Wine Consumed",
        description: `1 bottle of ${wine.producer} ${wine.name || ""} marked as consumed.`,
      });
      
      // Invalidate the wines query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/wines', 'in_cellar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/consumptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      // Close the dialog and form
      setShowDrinkDialog(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error consuming wine:", error);
      toast({
        title: "Error",
        description: "There was a problem recording the consumption.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Function to handle removal of wine without consuming
  async function handleRemoveWine() {
    if (!wine?.id) return;
    
    setIsSubmitting(true);
    try {
      // Update the wine status to remove it from the cellar
      await apiRequest("PATCH", `/api/wines/${wine.id}`, {
        ...wine,
        quantity: 0,
        consumedStatus: 'removed', // Add flag to mark as removed (not consumed)
        notes: wine.notes ? `${wine.notes}\n(Removed from cellar: ${new Date().toLocaleDateString()})` : `Removed from cellar: ${new Date().toLocaleDateString()}`
      });

      toast({
        title: "Wine Removed",
        description: `${wine.producer} ${wine.name || ""} has been removed from your cellar.`,
      });
      
      // Invalidate the wines query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/wines', 'in_cellar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      // Close the dialog and form
      setShowDrinkDialog(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error removing wine:", error);
      toast({
        title: "Error",
        description: "There was a problem removing the wine.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Function to look up wine information using AI
  async function handleWineInfoLookup() {
    const currentValues = form.getValues();
    const wineName = currentValues.name;
    const producer = currentValues.producer;
    const vintage = currentValues.vintage;
    
    // Check if we have enough information to perform a lookup
    if (!wineName && !producer) {
      toast({
        title: "Missing Information",
        description: "Please enter at least the wine name or producer to look up information.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if grape varieties or vineyard are already provided
    const hasGrapeVarieties = !!currentValues.grapeVarieties;
    const hasVineyard = !!currentValues.vineyard;
    
    if (hasGrapeVarieties && hasVineyard) {
      toast({
        title: "Information Already Provided",
        description: "Grape varieties and vineyard information are already filled in.",
      });
      return;
    }
    
    setIsLookingUpWineInfo(true);
    
    try {
      const result = await lookupWineInformation(wineName, producer, vintage);
      
      if (result.success && result.data) {
        // Store the lookup result
        setWineInfoResult({
          grapeVarieties: result.data.grapeVarieties,
          vineyard: result.data.vineyard,
          confidence: result.data.confidenceLevel
        });
        
        // Update form fields if they're empty
        if (!hasGrapeVarieties && result.data.grapeVarieties) {
          form.setValue('grapeVarieties', result.data.grapeVarieties, { shouldDirty: true });
        }
        
        if (!hasVineyard && result.data.vineyard) {
          form.setValue('vineyard', result.data.vineyard, { shouldDirty: true });
        }
        
        toast({
          title: "Wine Information Found",
          description: `Found information about ${wineName} with ${result.data.confidenceLevel} confidence.`,
        });
      } else {
        toast({
          title: "Information Not Found",
          description: result.message || "Could not find information about this wine.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error looking up wine information:", error);
      toast({
        title: "Error",
        description: "There was a problem looking up the wine information.",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpWineInfo(false);
    }
  }
  
  // Interface for comprehensive wine analysis response
  interface WineAnalysisResponse {
    success: boolean;
    data?: {
      start: string | number;
      end: string | number;
      confidence: string;
      reasoning: string;
      grapeVarieties?: string | null;
      region?: string | null;
      subregion?: string | null;
      notes?: string | null;
      cellaring?: string | null;
      pairings?: string | null;
      wineType?: string | null;  // Add this for the wine type
    };
    message?: string;
  }

  // Function to request comprehensive AI wine analysis

  async function handleDrinkingWindowRecommendation() {
    const currentValues = form.getValues();
    const wineName = currentValues.name;
    const producer = currentValues.producer;
    const vintage = currentValues.vintage;
    const type = currentValues.type;
    const region = currentValues.region;
    
    // Check if we have enough information to perform a recommendation
    if (!producer || !vintage) {
      toast({
        title: "Missing Information",
        description: "Please enter at least the producer and vintage to get a wine analysis.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true); // Reuse the isSubmitting state to show loading
    
    try {
      // Construct wine data for the API request
      const wineData = {
        producer,
        name: wineName || '',
        vintage: vintage || 0,
        type: type || 'red',
        region: region || '',
        subregion: currentValues.subregion || '',
        grapeVarieties: currentValues.grapeVarieties || ''
      };
      
      // Call the API to get comprehensive wine analysis
      const response = await apiRequest(
        "POST", 
        "/api/wine-drinking-window-recommendation", 
        { wineData }
      );
      
      const result: WineAnalysisResponse = await response.json();
      
      if (result.success && result.data) {
        // Create recommended drinking window object
        const recommendation = {
          startYear: typeof result.data.start === 'string' ? parseInt(result.data.start) : result.data.start,
          endYear: typeof result.data.end === 'string' ? parseInt(result.data.end) : result.data.end,
          notes: result.data.reasoning,
          isPastPrime: false // Determine this based on current year and end year
        };
        
        // Check if it's past prime
        const currentYear = new Date().getFullYear();
        if (recommendation.endYear < currentYear) {
          recommendation.isPastPrime = true;
        }
        
        // Set the recommendation in state
        setRecommendedDrinkingWindow(recommendation);
        
        // Update form fields with AI-provided information if available
        if (result.data.grapeVarieties && (!currentValues.grapeVarieties || currentValues.grapeVarieties.trim() === '')) {
          form.setValue('grapeVarieties', result.data.grapeVarieties, { shouldDirty: true });
        }
        
        if (result.data.region && (!currentValues.region || currentValues.region.trim() === '')) {
          form.setValue('region', result.data.region, { shouldDirty: true });
        }
        
        if (result.data.subregion && (!currentValues.subregion || currentValues.subregion.trim() === '')) {
          form.setValue('subregion', result.data.subregion, { shouldDirty: true });
        }
        
        // Add notes if provided and current notes are empty
        if (result.data.notes && (!currentValues.notes || currentValues.notes.trim() === '')) {
          const aiNotes = `${result.data.notes}\n\n` + 
                       (result.data.cellaring ? `Cellaring: ${result.data.cellaring}\n\n` : '') + 
                       (result.data.pairings ? `Recommended pairings: ${result.data.pairings}` : '');
          form.setValue('notes', aiNotes, { shouldDirty: true });
        }
        
        toast({
          title: "Wine Analysis Complete",
          description: `AI analyzed your wine and suggested optimal drinking between ${recommendation.startYear} - ${recommendation.endYear}. Additional information has been added to the form.`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: result.message || "Could not generate a wine analysis.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error getting wine analysis:", error);
      toast({
        title: "Error",
        description: "There was a problem analyzing the wine.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Function to enhance wine data with AI - implementing consistent behavior with spreadsheet import
  async function handleEnhanceWithAI() {
    const currentValues = form.getValues();
    const wineName = currentValues.name;
    const producer = currentValues.producer;
    const vintage = currentValues.vintage;
    const type = currentValues.type;
    const region = currentValues.region;
    
    // Check if we have enough information to perform enhancement
    if (!producer || !vintage) {
      toast({
        title: "Missing Information",
        description: "Please enter at least the producer and vintage to enhance the wine data.",
        variant: "destructive"
      });
      return;
    }
    
    setIsEnhancingWithAI(true);
    
    try {
      // Show initial toast notification with better description
      toast({
        title: "AI Wine Analysis in Progress",
        description: "Analyzing wine details, determining optimal drinking window, and identifying characteristics...",
      });

      // Construct wine data for the API request, matching the spreadsheet import flow format
      const wineData = {
        producer,
        name: wineName || '',
        vintage: vintage || 0,
        type: type || 'red',
        region: region || '',
        subregion: currentValues.subregion || '',
        grapeVarieties: currentValues.grapeVarieties || ''
      };
      
      // Create a temporary ID if this is a new wine (for consistency with spreadsheet import)
      const tempWineId = wine?.id || -1;
      
      // Log the request for debugging
      console.log("Making wine enhancement request with data:", wineData);
      
      // Call the API to get comprehensive wine analysis using the format from spreadsheet import
      const response = await apiRequest(
        "POST", 
        "/api/wine-drinking-window-recommendation", 
        {
          wineId: tempWineId,
          wineData: wineData
        }
      );
      
      const result: WineAnalysisResponse = await response.json();
      console.log("Received AI enhancement result:", result);
      
      if (result.success && result.data) {
        // Store the enhancement result
        setAiEnhancementResult(result.data);
        
        // Show the enhancement dialog
        setShowEnhanceDialog(true);
      } else {
        toast({
          title: "Enhancement Failed",
          description: result.message || "Could not enhance wine data.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error enhancing wine data:", error);
      toast({
        title: "Error",
        description: "There was a problem enhancing the wine data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancingWithAI(false);
    }
  }
  
  // Function to apply AI enhancements to the form
  function applyAIEnhancements() {
    if (!aiEnhancementResult) return;
    
    console.log("Applying AI enhancement results:", aiEnhancementResult);
    
    // Track which fields were enhanced for user feedback
    const fieldsEnhanced: string[] = [];
    
    // Apply drinking window
    if (aiEnhancementResult.start && aiEnhancementResult.end) {
      const startYear = typeof aiEnhancementResult.start === 'string' 
        ? parseInt(aiEnhancementResult.start) 
        : aiEnhancementResult.start;
        
      const endYear = typeof aiEnhancementResult.end === 'string' 
        ? parseInt(aiEnhancementResult.end) 
        : aiEnhancementResult.end;
      
      form.setValue('drinkingWindowStartYear', startYear, { shouldDirty: true });
      form.setValue('drinkingWindowEndYear', endYear, { shouldDirty: true });
      
      // Switch to custom drinking window type
      setDrinkingWindowType('custom');
      
      fieldsEnhanced.push('drinking window');
    }
    
    // Apply grape varieties
    if (aiEnhancementResult.grapeVarieties) {
      form.setValue('grapeVarieties', aiEnhancementResult.grapeVarieties, { shouldDirty: true });
      fieldsEnhanced.push('grape varieties');
    }
    
    // Apply region
    if (aiEnhancementResult.region) {
      form.setValue('region', aiEnhancementResult.region, { shouldDirty: true });
      fieldsEnhanced.push('region');
    }
    
    // Apply subregion
    if (aiEnhancementResult.subregion) {
      form.setValue('subregion', aiEnhancementResult.subregion, { shouldDirty: true });
      fieldsEnhanced.push('subregion');
    }
    
    // Apply type if it was provided
    if (aiEnhancementResult.wineType) {
      form.setValue('type', aiEnhancementResult.wineType.toLowerCase(), { shouldDirty: true });
      fieldsEnhanced.push('wine type');
    }
    
    // Combine notes information if it exists
    if (aiEnhancementResult.notes || aiEnhancementResult.cellaring || aiEnhancementResult.pairings) {
      let combinedNotes = '';
      
      if (aiEnhancementResult.notes) {
        combinedNotes += aiEnhancementResult.notes + '\n\n';
      }
      
      if (aiEnhancementResult.cellaring) {
        combinedNotes += 'Cellaring: ' + aiEnhancementResult.cellaring + '\n\n';
      }
      
      if (aiEnhancementResult.pairings) {
        combinedNotes += 'Pairings: ' + aiEnhancementResult.pairings;
      }
      
      if (combinedNotes) {
        form.setValue('notes', combinedNotes.trim(), { shouldDirty: true });
        fieldsEnhanced.push('notes');
      }
    }
    
    // Force form validation update
    form.trigger();
    
    // Store enhanced fields for visual feedback
    setEnhancedFields(fieldsEnhanced);
    setShowEnhancedFields(true);
    
    // Create a summary of what was enhanced
    const enhancementSummary = fieldsEnhanced.join(', ');
    
    toast({
      title: "AI Enhancements Applied",
      description: `Updated fields: ${enhancementSummary || 'none'}`,
      duration: 5000,
    });
    
    // Close the enhancement dialog
    setShowEnhanceDialog(false);
    
    // Auto-hide the enhanced field highlights after 5 seconds
    setTimeout(() => {
      setShowEnhancedFields(false);
    }, 5000);
  }
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      // Check for required fields - allow numeric vintage or "NV" for non-vintage wines
      if (!values.vintage && values.vintage !== 0) { // Allow 0 as a value for "NV" (Non-Vintage)
        // Show a more descriptive error
        toast({
          title: "Missing Vintage",
          description: "Please enter a vintage year or use 0 for non-vintage wines.",
          variant: "destructive"
        });
        
        form.setError("vintage", {
          type: "manual",
          message: "Enter vintage year or 0 for non-vintage"
        });
        
        setIsSubmitting(false);
        return;
      }
      
      // Apply drinking window based on selection
      const now = new Date();
      const currentYear = now.getFullYear();
      
      let drinkingWindowStart = null;
      let drinkingWindowEnd = null;
      
      if (drinkingWindowType === "drink_now") {
        drinkingWindowStart = now;
        drinkingWindowEnd = new Date(currentYear + 2, 11, 31);
      } else if (drinkingWindowType === "drink_later") {
        drinkingWindowStart = new Date(currentYear + 3, 0, 1);
        drinkingWindowEnd = new Date(currentYear + 10, 11, 31);
      } else if (drinkingWindowType === "custom") {
        // Convert year values to Date objects (Jan 1 of start year, Dec 31 of end year)
        const startYear = form.getValues("drinkingWindowStartYear");
        const endYear = form.getValues("drinkingWindowEndYear");
        
        drinkingWindowStart = startYear ? new Date(startYear, 0, 1) : null; // Jan 1st of start year
        drinkingWindowEnd = endYear ? new Date(endYear, 11, 31) : null; // Dec 31st of end year
      }

      // Remove the year fields from final submission data, convert dates to ISO strings
      const { drinkingWindowStartYear, drinkingWindowEndYear, ...otherValues } = values;
      
      // Prepare final wine data for submission
      const wineData = {
        ...otherValues,
        // Purchase date should already be an ISO string from the date picker
        purchaseDate: values.purchaseDate || null, 
        drinkingStatus: drinkingWindowType,
        drinkingWindowStart: drinkingWindowStart ? new Date(drinkingWindowStart).toISOString() : null,
        drinkingWindowEnd: drinkingWindowEnd ? new Date(drinkingWindowEnd).toISOString() : null,
      };

      // Debug information
      console.log("Form submission data:", wineData);
      
      if (wine?.id) {
        // Update existing wine - all fields
        console.log("Updating wine ID:", wine.id, "with data:", wineData);
        
        // Send all the fields, not just the ones that changed
        const response = await apiRequest("PATCH", `/api/wines/${wine.id}`, wineData);
        console.log("Update response:", response);
        
        toast({
          title: "Wine Updated",
          description: `${values.vintage} ${values.producer} ${values.name} has been updated.`,
        });
      } else {
        // Create new wine
        console.log("Creating new wine with data:", wineData);
        
        await apiRequest("POST", "/api/wines", wineData);
        toast({
          title: "Wine Added",
          description: `${values.vintage} ${values.producer} ${values.name} has been added to your cellar.`,
        });
      }

      // Invalidate the wines query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/wines', 'in_cellar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Reset form if creating new wine
      if (!wine) {
        form.reset();
      }
    } catch (error) {
      console.error("Error saving wine:", error);
      toast({
        title: "Error",
        description: "There was a problem saving the wine.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  // We're going to use a more straightforward approach for multi-bottle detection

  // Show multi-bottle wizard if needed
  if (showMultiBottleWizard && multiBottleData) {
    return (
      <MultiBottleWizard
        bottleData={multiBottleData}
        onComplete={() => {
          setShowMultiBottleWizard(false);
          setMultiBottleData(null);
          // Return to the collection view after all bottles are processed
          if (onSuccess) onSuccess();
        }}
        onCancel={() => {
          setShowMultiBottleWizard(false);
          setMultiBottleData(null);
          setEntryMethod("manual");
        }}
        onEnhanceWithAI={async (bottle) => {
          // Prepare the data for AI enhancement
          const wineData = {
            producer: bottle.producer || '',
            name: bottle.name || '',
            vintage: bottle.vintage || 0,
            type: bottle.type || 'red',
            region: bottle.region || '',
            subregion: bottle.subregion || '',
            grapeVarieties: bottle.grapeVarieties || '',
          };
          
          // Validate required fields - only attempt enhancement if we have enough info
          if (!wineData.producer || !wineData.vintage) {
            toast({
              title: "Missing Information",
              description: "Please add producer and vintage information before enhancing with AI.",
              variant: "destructive"
            });
            return;
          }
          
          setIsEnhancingWithAI(true);
          
          try {
            // Show initial toast notification with better description
            toast({
              title: "AI Wine Analysis in Progress",
              description: "Analyzing wine details and determining optimal drinking window...",
            });
            
            // Create a temporary ID for the API request
            const tempWineId = -1;
            
            // Call the API to get comprehensive wine analysis
            const response = await apiRequest(
              "POST", 
              "/api/wine-drinking-window-recommendation", 
              {
                wineId: tempWineId,
                wineData: wineData
              }
            );
            
            const result = await response.json();
            
            if (result.success && result.data) {
              // Store the enhancement result in the form values
              const data = result.data;
              
              // Set form values from the AI results
              form.setValue("producer", wineData.producer);
              form.setValue("name", wineData.name);
              form.setValue("vintage", wineData.vintage);
              form.setValue("type", wineData.type);
              
              // Enhanced fields
              if (data.grapeVarieties) {
                form.setValue("grapeVarieties", data.grapeVarieties);
              }
              
              if (data.region) {
                form.setValue("region", data.region);
              }
              
              if (data.subregion) {
                form.setValue("subregion", data.subregion);
              }
              
              if (data.start && data.end) {
                const startYear = typeof data.start === 'string' ? parseInt(data.start) : data.start;
                const endYear = typeof data.end === 'string' ? parseInt(data.end) : data.end;
                
                form.setValue("drinkingWindowStartYear", startYear);
                form.setValue("drinkingWindowEndYear", endYear);
                setDrinkingWindowType("custom");
              }
              
              // Combine notes
              if (data.notes || data.cellaring || data.pairings) {
                let combinedNotes = '';
                
                if (data.notes) {
                  combinedNotes += data.notes + '\n\n';
                }
                
                if (data.cellaring) {
                  combinedNotes += 'Cellaring: ' + data.cellaring + '\n\n';
                }
                
                if (data.pairings) {
                  combinedNotes += 'Pairings: ' + data.pairings;
                }
                
                if (combinedNotes) {
                  form.setValue("notes", combinedNotes.trim());
                }
              }
              
              // Show success message
              toast({
                title: "Wine Enhanced with AI",
                description: `Successfully enhanced wine data with drinking window ${data.start}-${data.end}`,
                variant: "default"
              });
            } else {
              toast({
                title: "Enhancement Failed",
                description: result.message || "Could not enhance wine data.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error("Error enhancing wine data:", error);
            toast({
              title: "Error",
              description: "There was a problem enhancing the wine data. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsEnhancingWithAI(false);
          }
        }}
        isEnhancingWithAI={isEnhancingWithAI}
        onProcessBottle={(bottle, index, total, addToCollection = false) => {
          console.log("Processing bottle with data:", bottle);
          
          // First reset all form values to ensure we start fresh
          form.reset();
          
          // Now set form values from the bottle data
          // This ensures every field gets set from the edited bottle
          form.setValue("producer", bottle.producer || "");
          form.setValue("name", bottle.name || "");
          form.setValue("vintage", bottle.vintage || new Date().getFullYear());
          form.setValue("region", bottle.region || "");
          form.setValue("subregion", bottle.subregion || "");
          form.setValue("grapeVarieties", bottle.grapeVarieties || "");
          form.setValue("type", bottle.type?.toLowerCase() || "red");
          
          if (bottle.notes) {
            form.setValue("notes", bottle.notes);
          }
          
          // Handle recommended drinking window if available
          if (bottle.recommendedDrinkingWindow) {
            const { startYear, endYear, isPastPrime } = bottle.recommendedDrinkingWindow;
            
            if (isPastPrime) {
              form.setValue("drinkingStatus", "drink_now");
            } else {
              form.setValue("drinkingStatus", "custom");
              form.setValue("drinkingWindowStartYear", startYear);
              form.setValue("drinkingWindowEndYear", endYear);
            }
          }
          
          // Check if this is a duplicate wine
          const isDuplicate = existingWines.some((existingWine: any) => 
            existingWine.producer === bottle.producer &&
            existingWine.name === bottle.name &&
            existingWine.vintage === bottle.vintage
          );
          
          // Set quantity based on whether it's a duplicate
          form.setValue("quantity", isDuplicate ? 2 : 1);
          
          // Only submit the form if explicitly told to add to collection
          // This allows us to batch process at the end
          if (addToCollection) {
            // Log the final form values before submission
            console.log("Submitting form with values:", form.getValues());
            
            // Submit the form with the current bottle data
            onSubmit(form.getValues());
          }
        }}
        existingWines={existingWines}
      />
    );
  }

  return (
    <div className="p-1 relative">
      
      {/* Close button removed in favor of click-outside functionality */}
      
      <Tabs defaultValue="manual" value={entryMethod} onValueChange={setEntryMethod} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="label">Capture Label</TabsTrigger>
          <TabsTrigger value="receipt">Upload Receipt</TabsTrigger>
        </TabsList>
        <TabsContent value="manual">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="producer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producer</FormLabel>
                      <FormControl>
                        <Autocomplete 
                          placeholder="e.g. Château Margaux" 
                          suggestions={suggestions.producers}
                          value={field.value}
                          onValueChange={field.onChange}
                          className={enhancedFields.includes('producer') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vintage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vintage</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g. 2015 or NV for non-vintage" 
                          {...field}
                          value={field.value || ""}
                          className={enhancedFields.includes('wine type') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            // Handle "NV" input (convert to 0)
                            if (value.toLowerCase() === "nv") {
                              field.onChange(0);
                            } else {
                              // Try to convert to number
                              const numValue = parseInt(value);
                              if (!isNaN(numValue) || value === "") {
                                field.onChange(value === "" ? undefined : numValue);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        Enter vintage year or "NV" for non-vintage wines
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vineyard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vineyard</FormLabel>
                      <FormControl>
                        <Autocomplete 
                          placeholder="e.g. V Madrone Vineyard" 
                          suggestions={suggestions.vineyards}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wine Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a wine type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="red">Red Wine</SelectItem>
                          <SelectItem value="white">White Wine</SelectItem>
                          <SelectItem value="rose">Rosé</SelectItem>
                          <SelectItem value="sparkling">Sparkling Wine</SelectItem>
                          <SelectItem value="dessert">Dessert Wine</SelectItem>
                          <SelectItem value="fortified">Fortified Wine</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Autocomplete 
                          placeholder="e.g. Napa Valley, Bordeaux" 
                          suggestions={suggestions.regions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          className={enhancedFields.includes('region') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subregion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-region</FormLabel>
                      <FormControl>
                        <Autocomplete 
                          placeholder="e.g. St. Helena, Pauillac" 
                          suggestions={suggestions.subregions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          className={enhancedFields.includes('subregion') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="grapeVarieties"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Grape Varieties</FormLabel>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleWineInfoLookup}
                          disabled={isLookingUpWineInfo}
                          className="h-7 px-2 text-xs"
                        >
                          {isLookingUpWineInfo ? "Looking up..." : "AI Lookup"}
                        </Button>
                      </div>
                      <FormControl>
                        <Autocomplete 
                          placeholder="e.g. Cabernet Sauvignon, Merlot" 
                          suggestions={suggestions.grapeVarieties}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          className={enhancedFields.includes('grape varieties') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                        />
                      </FormControl>
                      {wineInfoResult?.grapeVarieties && (
                        <div className="text-xs text-muted-foreground mt-1">
                          AI found: {wineInfoResult.grapeVarieties} ({wineInfoResult.confidence} confidence)
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bottleSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bottle Size</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "750ml"} // Ensure it always has a value
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bottle size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="750ml">750ml (Standard)</SelectItem>
                          <SelectItem value="375ml">375ml (Half)</SelectItem>
                          <SelectItem value="1.5L">1.5L (Magnum)</SelectItem>
                          <SelectItem value="3L">3L (Double Magnum)</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            // Allow empty input for typing
                            if (inputValue === "") {
                              field.onChange("");
                            } else {
                              // Only apply numeric value when typing is complete
                              const numValue = parseInt(inputValue);
                              if (!isNaN(numValue)) {
                                field.onChange(numValue <= 0 ? 1 : numValue);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // On blur, ensure we have at least 1
                            const value = parseInt(e.target.value);
                            if (isNaN(value) || value < 1) {
                              field.onChange(1);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            className="pl-7" 
                            placeholder="0.00" 
                            {...field}
                            value={field.value || ""}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Purchase Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              // Ensure we properly handle the date value
                              field.onChange(date ? date.toISOString() : undefined);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wine Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Cabernet Sauvignon" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Drinking Window</FormLabel>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleDrinkingWindowRecommendation}
                    disabled={isSubmitting}
                    className="h-7 px-2 text-xs"
                  >
                    {isSubmitting ? "Getting recommendation..." : "Get AI Recommendation"}
                  </Button>
                </div>
                
                {/* Show Claude's recommendation if available */}
                {recommendedDrinkingWindow && (
                  <div className="bg-burgundy-50 border border-burgundy-200 rounded-md p-3 mb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-burgundy-700 flex items-center">
                          <Wine className="h-4 w-4 mr-1" /> 
                          AI Recommended Drinking Window
                        </h4>
                        <p className="text-sm text-burgundy-800 mt-1">
                          {recommendedDrinkingWindow.isPastPrime 
                            ? "This wine is past its prime drinking window." 
                            : `Recommended: ${recommendedDrinkingWindow.startYear} - ${recommendedDrinkingWindow.endYear}`}
                        </p>
                        <p className="text-xs text-burgundy-600 mt-1">
                          {recommendedDrinkingWindow.notes}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          type="button"
                          size="sm"
                          variant="ghost" 
                          className="h-6 text-xs text-burgundy-700"
                          onClick={async () => {
                            // Apply the recommendation to the form
                            setDrinkingWindowType("custom");
                            form.setValue("drinkingWindowStartYear", recommendedDrinkingWindow.startYear);
                            form.setValue("drinkingWindowEndYear", recommendedDrinkingWindow.endYear);
                            
                            // Record analytics that the user accepted the drinking window recommendation
                            if (originalPrediction) {
                              try {
                                const imageHash = btoa(originalPrediction.producer + originalPrediction.vintage); // Simple hash
                                await apiRequest("POST", "/api/label-analytics", {
                                  imageHash,
                                  originalPrediction,
                                  wasAccurate: true, // General recognition was accurate
                                  drinkingWindowAccepted: true // User applied the recommended drinking window
                                });
                                console.log("Recorded drinking window acceptance");
                              } catch (error) {
                                console.error("Failed to record analytics:", error);
                              }
                            }
                            
                            toast({
                              title: "Recommendation Applied",
                              description: "The recommended drinking window has been applied.",
                            });
                          }}
                        >
                          Apply
                        </Button>
                        <Button 
                          type="button"
                          size="sm"
                          variant="ghost" 
                          className="h-6 text-xs text-burgundy-500"
                          onClick={async () => {
                            // Record that the recommendation was rejected
                            if (originalPrediction) {
                              try {
                                const imageHash = btoa(originalPrediction.producer + originalPrediction.vintage); // Simple hash
                                await apiRequest("POST", "/api/label-analytics", {
                                  imageHash,
                                  originalPrediction,
                                  wasAccurate: true, // General recognition was accurate
                                  drinkingWindowAccepted: false // User rejected the recommended drinking window
                                });
                                console.log("Recorded drinking window rejection");
                              } catch (error) {
                                console.error("Failed to record analytics:", error);
                              }
                            }
                            
                            // Hide the recommendation UI
                            setRecommendedDrinkingWindow(null);
                            
                            toast({
                              title: "Recommendation Ignored",
                              description: "You can set a custom drinking window below."
                            });
                          }}
                        >
                          Ignore
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-4 mt-2">
                  <Button
                    type="button"
                    variant={drinkingWindowType === "drink_now" ? "default" : "outline"}
                    onClick={() => setDrinkingWindowType("drink_now")}
                    className="flex-1"
                  >
                    Drink Now
                  </Button>
                  <Button
                    type="button"
                    variant={drinkingWindowType === "drink_later" ? "default" : "outline"}
                    onClick={() => setDrinkingWindowType("drink_later")}
                    className="flex-1"
                  >
                    Drink Later
                  </Button>
                  <Button
                    type="button"
                    variant={drinkingWindowType === "custom" ? "default" : "outline"}
                    onClick={() => setDrinkingWindowType("custom")}
                    className="flex-1"
                  >
                    Custom
                  </Button>
                </div>
              </div>
              
              {drinkingWindowType === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="drinkingWindowStartYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Drinking From (Year)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1900} 
                            max={new Date().getFullYear() + 50}
                            placeholder={new Date().getFullYear().toString()} 
                            {...field} 
                            value={field.value || ""}
                            className={enhancedFields.includes('drinking window') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="drinkingWindowEndYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drink By (Year)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1900} 
                            max={new Date().getFullYear() + 50}
                            placeholder={(new Date().getFullYear() + 5).toString()} 
                            {...field} 
                            value={field.value || ""}
                            className={enhancedFields.includes('drinking window') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Storage Location Section */}
              <StorageLocationField form={form} />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add your tasting notes or other information about this wine..." 
                        className={`h-24 ${enhancedFields.includes('notes') && showEnhancedFields ? 'border-green-500 bg-green-50' : ''}`}
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                {/* Show Drink/Remove button only when editing an existing wine */}
                {wine && wine.id && (
                  <Button 
                    type="button"
                    variant="secondary"
                    className="mr-auto bg-burgundy-100 hover:bg-burgundy-200 text-burgundy-800"
                    onClick={() => setShowDrinkDialog(true)}
                  >
                    Drink or Remove
                  </Button>
                )}
                
                {/* Add AI enhancement button when we have producer and vintage data */}
                {(form.getValues("producer") && form.getValues("vintage")) && (
                  <Button
                    type="button"
                    onClick={handleEnhanceWithAI}
                    disabled={isEnhancingWithAI}
                    variant="outline"
                    className="border-burgundy-600 text-burgundy-700 hover:bg-burgundy-50"
                  >
                    {isEnhancingWithAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Enhance with AI
                      </>
                    )}
                  </Button>
                )}
                
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : wine ? "Update Wine" : "Add to Cellar"}
                </Button>

                {/* Confirmation Dialog for Unsaved Changes */}
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have unsaved changes that will be lost if you close this form.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <p className="text-gray-600 mb-2">Choose an option:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Continue editing to save your changes</li>
                        <li>Discard changes to exit without saving</li>
                      </ul>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Continue Editing</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={onSuccess}
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        Discard Changes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {/* AI Enhancement Dialog */}
                <AlertDialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
                  <AlertDialogContent className="max-w-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>AI Wine Analysis</AlertDialogTitle>
                      <AlertDialogDescription>
                        AI has analyzed your wine and found the following information. Fields highlighted in green will be updated with the enhanced data. Would you like to apply these enhancements?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-5">
                      {aiEnhancementResult && (
                        <>
                          {/* Drinking Window Section */}
                          <div className="p-3 border rounded-md bg-cream-50 relative">
                            {aiEnhancementResult.start && aiEnhancementResult.end && (
                              <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <span className="mr-1">Will update</span>
                                <Sparkles className="h-3 w-3" />
                              </div>
                            )}
                            <h4 className="font-medium mb-2 text-burgundy-700">Recommended Drinking Window</h4>
                            <p className="font-medium">
                              {aiEnhancementResult.start} - {aiEnhancementResult.end}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {aiEnhancementResult.reasoning}
                            </p>
                            <div className="mt-2 text-xs inline-flex items-center px-2 py-1 rounded-full bg-burgundy-100 text-burgundy-800">
                              {aiEnhancementResult.confidence} confidence
                            </div>
                          </div>
                          
                          {/* Wine Information Section */}
                          <div className="p-3 border rounded-md relative">
                            <h4 className="font-medium mb-2 text-burgundy-700">Wine Information</h4>
                            
                            {/* Indicator that fields will be updated */}
                            {(aiEnhancementResult.grapeVarieties || aiEnhancementResult.region || 
                              aiEnhancementResult.subregion || aiEnhancementResult.wineType) && (
                              <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <span className="mr-1">Will update</span>
                                <Sparkles className="h-3 w-3" />
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {aiEnhancementResult.grapeVarieties && (
                                <div className="border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Grape Varieties:</span>
                                  <p className="text-sm">{aiEnhancementResult.grapeVarieties}</p>
                                </div>
                              )}
                              
                              {aiEnhancementResult.region && (
                                <div className="border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Region:</span>
                                  <p className="text-sm">{aiEnhancementResult.region}</p>
                                </div>
                              )}
                              
                              {aiEnhancementResult.subregion && (
                                <div className="border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Sub-region:</span>
                                  <p className="text-sm">{aiEnhancementResult.subregion}</p>
                                </div>
                              )}
                              
                              {aiEnhancementResult.wineType && (
                                <div className="border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Wine Type:</span>
                                  <p className="text-sm">{aiEnhancementResult.wineType}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Additional Information Section */}
                          {(aiEnhancementResult.notes || aiEnhancementResult.cellaring || aiEnhancementResult.pairings) && (
                            <div className="p-3 border rounded-md relative">
                              <h4 className="font-medium mb-2 text-burgundy-700">Additional Information</h4>
                              
                              {/* Indicator that notes will be updated */}
                              <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <span className="mr-1">Will update</span>
                                <Sparkles className="h-3 w-3" />
                              </div>
                              
                              {aiEnhancementResult.notes && (
                                <div className="mb-3 border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Tasting Notes:</span>
                                  <p className="text-sm">{aiEnhancementResult.notes}</p>
                                </div>
                              )}
                              
                              {aiEnhancementResult.cellaring && (
                                <div className="mb-3 border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Cellaring:</span>
                                  <p className="text-sm">{aiEnhancementResult.cellaring}</p>
                                </div>
                              )}
                              
                              {aiEnhancementResult.pairings && (
                                <div className="border-l-2 border-green-500 pl-2">
                                  <span className="font-medium">Food Pairings:</span>
                                  <p className="text-sm">{aiEnhancementResult.pairings}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Original</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={applyAIEnhancements}
                        className="bg-burgundy-600 hover:bg-burgundy-700"
                      >
                        Apply AI Enhancements
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {/* Drink/Remove Dialog */}
                <AlertDialog open={showDrinkDialog} onOpenChange={setShowDrinkDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Consume or Remove Wine</AlertDialogTitle>
                      <AlertDialogDescription>
                        Would you like to mark this wine as consumed or remove it from your cellar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 flex flex-col space-y-2">
                      <div className="p-3 border rounded-md hover:bg-cream-50">
                        <h4 className="font-medium mb-1 text-burgundy-700">Consume Wine</h4>
                        <p className="text-sm text-gray-600">
                          Decreases quantity by 1 and creates a consumption record with tasting notes.
                        </p>
                      </div>
                      <div className="p-3 border rounded-md hover:bg-cream-50">
                        <h4 className="font-medium mb-1 text-burgundy-700">Remove from Cellar</h4>
                        <p className="text-sm text-gray-600">
                          Removes wine from your collection without creating a consumption record (for gifts, damaged bottles, etc.)
                        </p>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button 
                        onClick={handleRemoveWine}
                        disabled={isSubmitting}
                        variant="outline"
                        className="mr-2"
                      >
                        Remove from Cellar
                      </Button>
                      <AlertDialogAction 
                        onClick={handleDrinkWine}
                        disabled={isSubmitting}
                        className="bg-burgundy-600 hover:bg-burgundy-700"
                      >
                        {isSubmitting ? "Processing..." : "Mark as Consumed"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </form>
          </Form>
        </TabsContent>
        
        
        <TabsContent value="label">
          <div className="space-y-6">
            <WineLabelRecognition 
              onResult={(recognitionResult) => {
                // Store the original prediction for analytics
                setOriginalPrediction(recognitionResult);
                
                // Handle the recognition result by updating the form fields
                form.setValue("producer", recognitionResult.producer || "");
                form.setValue("name", recognitionResult.name || "");
                
                // Set a default current year vintage if not detected
                const currentYear = new Date().getFullYear();
                form.setValue("vintage", recognitionResult.vintage || currentYear);
                
                form.setValue("region", recognitionResult.region || "");
                form.setValue("subregion", recognitionResult.subregion || "");
                form.setValue("grapeVarieties", recognitionResult.grapeVarieties || "");
                form.setValue("type", recognitionResult.type?.toLowerCase() || "red");
                
                // Check if this is a duplicate wine to increase quantity
                const isDuplicate = existingWines.some((existingWine: any) => 
                  existingWine.producer === recognitionResult.producer &&
                  existingWine.name === recognitionResult.name &&
                  existingWine.vintage === recognitionResult.vintage
                );
                
                if (isDuplicate) {
                  form.setValue("quantity", 2); // Default to 2 for duplicates, user can adjust
                  
                  toast({
                    title: "Duplicate Wine Detected",
                    description: "This wine appears to already exist in your collection. Quantity has been increased to 2.",
                  });
                } else {
                  // For new wines, ensure quantity is 1
                  form.setValue("quantity", 1);
                }
                
                // Store comprehensive wine data if available
                if (recognitionResult.tasting || recognitionResult.foodPairings || 
                    recognitionResult.servingSuggestions || recognitionResult.productionDetails || 
                    recognitionResult.rating) {
                  
                  setComprehensiveWineData({
                    tasting: recognitionResult.tasting,
                    foodPairings: recognitionResult.foodPairings,
                    servingSuggestions: recognitionResult.servingSuggestions,
                    productionDetails: recognitionResult.productionDetails,
                    rating: recognitionResult.rating
                  });
                  
                  // Generate notes from comprehensive data
                  let aiNotes = "";
                  
                  if (recognitionResult.tasting?.characteristics) {
                    aiNotes += `Tasting Notes: ${recognitionResult.tasting.characteristics}\n\n`;
                  }
                  
                  if (recognitionResult.tasting?.ageability) {
                    aiNotes += `Ageability: ${recognitionResult.tasting.ageability}\n`;
                  }
                  
                  if (recognitionResult.tasting?.maturity) {
                    aiNotes += `Current Maturity: ${recognitionResult.tasting.maturity}\n\n`;
                  }
                  
                  if (recognitionResult.foodPairings) {
                    aiNotes += `Food Pairings: ${recognitionResult.foodPairings}\n\n`;
                  }
                  
                  if (recognitionResult.servingSuggestions) {
                    aiNotes += `Serving Suggestions: ${recognitionResult.servingSuggestions}\n\n`;
                  }
                  
                  if (recognitionResult.productionDetails?.winemaking) {
                    aiNotes += `Winemaking: ${recognitionResult.productionDetails.winemaking}\n`;
                  }
                  
                  if (recognitionResult.productionDetails?.terroir) {
                    aiNotes += `Terroir: ${recognitionResult.productionDetails.terroir}\n`;
                  }
                  
                  if (recognitionResult.productionDetails?.classification) {
                    aiNotes += `Classification: ${recognitionResult.productionDetails.classification}\n\n`;
                  }
                  
                  if (recognitionResult.rating?.score) {
                    aiNotes += `Estimated Rating: ${recognitionResult.rating.score}/100 (${recognitionResult.rating.confidenceLevel} confidence)\n`;
                  }
                  
                  // Set notes if there's content and the field is empty
                  if (aiNotes.trim() !== "") {
                    form.setValue("notes", aiNotes, { shouldDirty: true });
                  }
                }
                
                // Handle recommended drinking window if available
                if (recognitionResult.recommendedDrinkingWindow) {
                  const { startYear, endYear, isPastPrime, notes } = recognitionResult.recommendedDrinkingWindow;
                  
                  // Store the recommendation for later use
                  setRecommendedDrinkingWindow({
                    startYear,
                    endYear, 
                    isPastPrime,
                    notes
                  });
                  
                  // If it's a past prime wine, set to drink now
                  if (isPastPrime) {
                    setDrinkingWindowType("drink_now");
                  } else {
                    // Set to custom by default so we can show the years
                    setDrinkingWindowType("custom");
                    // Fill in the recommended years
                    form.setValue("drinkingWindowStartYear", startYear);
                    form.setValue("drinkingWindowEndYear", endYear);
                  }
                }
                
                // If multiple bottles are detected, launch multi-bottle wizard
                if (recognitionResult.multipleBottlesDetected && recognitionResult.imageData) {
                  // We need to fetch all bottle data
                  toast({
                    title: "Multiple Bottles Detected",
                    description: `We've detected ${recognitionResult.bottleCount} wine bottles. Preparing to review them...`,
                  });
                  
                  // Make an API call to analyze all bottles
                  fetch('/api/analyze-wine-label?detectMultiple=true', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      imageData: recognitionResult.imageData,
                      checkForDuplicates: true 
                    }),
                    credentials: 'include'
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success && data.data && data.data.bottles) {
                      // Store the multi-bottle data and show the wizard
                      setMultiBottleData(data.data);
                      setShowMultiBottleWizard(true);
                      
                      // The form data will be updated for each bottle in the wizard
                      return;
                    } else {
                      throw new Error("Failed to analyze all bottles");
                    }
                  })
                  .catch(error => {
                    console.error("Multi-bottle analysis error:", error);
                    toast({
                      title: "Error",
                      description: "Failed to analyze all bottles. Only the first bottle will be added.",
                      variant: "destructive"
                    });
                    
                    // Continue with the first bottle
                    setEntryMethod("manual");
                  });
                  
                  return; // Stop here and wait for multi-bottle processing
                }
                
                // Switch to manual entry form to allow user to edit or complete missing fields
                setEntryMethod("manual");
                
                toast({
                  title: "Wine Label Recognized",
                  description: "The wine details have been filled in. Please review and make any necessary changes.",
                });
              }}
              onCancel={() => setEntryMethod("manual")}
              detectMultipleBottles={true}
              existingWines={existingWines}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="receipt">
          <div 
            className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
              isDragOver 
                ? 'border-burgundy-400 bg-burgundy-50' 
                : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Wine Receipt</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a receipt or invoice from a winery to automatically extract wine information.
              We'll identify wine items and filter out non-wine purchases like tasting fees.
            </p>
            
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptUpload}
                className="hidden"
                id="receipt-upload"
                disabled={isParsingReceipt}
              />
              
              <div className="space-y-2">
                <label
                  htmlFor="receipt-upload"
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-burgundy-600 hover:bg-burgundy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-burgundy-500 cursor-pointer ${
                    isParsingReceipt ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isParsingReceipt ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Parsing Receipt...
                    </>
                  ) : (
                    <>
                      <Upload className="-ml-1 mr-2 h-5 w-5" />
                      Choose Receipt File
                    </>
                  )}
                </label>
                
                <p className="text-xs text-gray-500">
                  or drag and drop an image or PDF here
                </p>
              </div>
              
              {receiptFile && (
                <p className="text-sm text-gray-600">
                  Selected: {receiptFile.name}
                </p>
              )}
            </div>
            
            {/* Display parsed wines */}
            {parsedReceiptWines.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-md font-medium text-gray-900">Found Wines in Receipt:</h4>
                <div className="space-y-2">
                  {parsedReceiptWines.map((wine, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-md ${
                        wine.isDuplicate 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-cream-50 border-cream-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-gray-900">
                              {wine.vintage} {wine.producer} {wine.name}
                            </p>
                            {wine.isDuplicate && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Duplicate
                              </span>
                            )}
                            {wine.aiEnhanced && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Enhanced
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Qty: {wine.quantity} | ${wine.price} | {wine.type}</p>
                            {wine.region && <p>Region: {wine.region}</p>}
                            {wine.grapeVarieties && <p>Varieties: {wine.grapeVarieties}</p>}
                            {wine.drinkingWindowStart && wine.drinkingWindowEnd && (
                              <p className="text-burgundy-600">
                                Drink: {wine.drinkingWindowStart} - {wine.drinkingWindowEnd}
                              </p>
                            )}
                          </div>
                          
                          {wine.matchStatus === 'duplicate' && (
                            <p className="text-xs text-yellow-700 mt-2">
                              This wine appears to already exist in your cellar. Adding will increase quantity.
                            </p>
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addWineFromReceipt(wine)}
                          className="bg-burgundy-600 hover:bg-burgundy-700 ml-4"
                        >
                          {wine.isDuplicate ? 'Add Anyway' : 'Add This Wine'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
