import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAutocompleteSuggestions } from "@/lib/autocompleteService";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Wine, insertWineSchema } from "@shared/schema";
import { Autocomplete } from "@/components/ui/autocomplete";
import StorageLocationField from "./StorageLocationField";

const formSchema = insertWineSchema.extend({
  vintage: z.coerce.number().min(1900).max(new Date().getFullYear() + 10).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  currentValue: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(1).default(1),
  // Add year fields for custom drinking window
  drinkingWindowStartYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 50).optional(),
  drinkingWindowEndYear: z.coerce.number().min(1900).max(new Date().getFullYear() + 50).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddWineFormProps {
  wine?: Wine;
  onSuccess?: () => void;
  hideCloseButton?: boolean;
}

export default function AddWineForm({ wine, onSuccess, hideCloseButton = false }: AddWineFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryMethod, setEntryMethod] = useState("manual");
  const [drinkingWindowType, setDrinkingWindowType] = useState(
    wine?.drinkingStatus || "drink_later"
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDrinkDialog, setShowDrinkDialog] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  
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
  
  // Track when form becomes dirty (modified)
  useEffect(() => {
    const subscription = form.watch(() => {
      setFormDirty(true);
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Function to handle consumption or removal of wine
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
  
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
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

      if (wine?.id) {
        // Update existing wine
        await apiRequest("PATCH", `/api/wines/${wine.id}`, wineData);
        toast({
          title: "Wine Updated",
          description: `${values.vintage} ${values.producer} ${values.name} has been updated.`,
        });
      } else {
        // Create new wine
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

  return (
    <div className="p-1 relative">
      {/* Add close button in top right corner */}
      <button 
        type="button"
        className="absolute top-0 right-0 p-2 text-gray-500 hover:text-burgundy-600 transition-colors"
        onClick={() => {
          if (formDirty) {
            setShowConfirmDialog(true);
          } else {
            onSuccess?.();
          }
        }}
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <Tabs defaultValue="manual" value={entryMethod} onValueChange={setEntryMethod} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="barcode">Scan Barcode</TabsTrigger>
          <TabsTrigger value="label">Capture Label</TabsTrigger>
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
                          type="number" 
                          placeholder="e.g. 2015" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
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
                      <FormLabel>Grape Varieties</FormLabel>
                      <FormControl>
                        <Autocomplete 
                          placeholder="e.g. Cabernet Sauvignon, Merlot" 
                          suggestions={suggestions.grapeVarieties}
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
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                <FormLabel>Drinking Window</FormLabel>
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
                            min={new Date().getFullYear()} 
                            max={new Date().getFullYear() + 50}
                            placeholder={new Date().getFullYear().toString()} 
                            {...field} 
                            value={field.value || ""}
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
                            min={new Date().getFullYear()} 
                            max={new Date().getFullYear() + 50}
                            placeholder={(new Date().getFullYear() + 5).toString()} 
                            {...field} 
                            value={field.value || ""}
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
                        className="h-24"
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
                
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : wine ? "Update Wine" : "Add to Cellar"}
                </Button>

                {/* Confirmation Dialog for Unsaved Changes */}
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to leave without saving?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Continue Editing</AlertDialogCancel>
                      <AlertDialogAction onClick={onSuccess}>Discard Changes</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                {/* Drink/Remove Dialog */}
                <AlertDialog open={showDrinkDialog} onOpenChange={setShowDrinkDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Consume Wine</AlertDialogTitle>
                      <AlertDialogDescription>
                        Would you like to mark this wine as consumed? This will decrease the quantity by 1 and create a consumption record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
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
        
        <TabsContent value="barcode">
          <div className="text-center py-12">
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-burgundy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Scan Barcode</h3>
            <p className="text-gray-600 mb-4">Point your camera at a wine bottle barcode to automatically lookup wine information.</p>
            <Button onClick={() => setEntryMethod("manual")} variant="outline">
              Switch to Manual Entry
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="label">
          <div className="text-center py-12">
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-burgundy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Capture Wine Label</h3>
            <p className="text-gray-600 mb-4">Take a photo of the wine label to identify and fill in wine details automatically.</p>
            <Button onClick={() => setEntryMethod("manual")} variant="outline">
              Switch to Manual Entry
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
