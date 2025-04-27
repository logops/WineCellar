import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

const formSchema = insertWineSchema.extend({
  vintage: z.coerce.number().min(1900).max(new Date().getFullYear() + 10).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  currentValue: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(1).default(1),
});

type FormValues = z.infer<typeof formSchema>;

interface AddWineFormProps {
  wine?: Wine;
  onSuccess?: () => void;
}

export default function AddWineForm({ wine, onSuccess }: AddWineFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryMethod, setEntryMethod] = useState("manual");
  const [drinkingWindowType, setDrinkingWindowType] = useState(
    wine?.drinkingStatus || "drink_later"
  );

  // Convert dates from strings to Date objects if needed
  const defaultValues: Partial<FormValues> = {
    name: wine?.name || "",
    producer: wine?.producer || "",
    vintage: wine?.vintage || undefined,
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
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

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
        drinkingWindowStart = form.getValues("drinkingWindowStart");
        drinkingWindowEnd = form.getValues("drinkingWindowEnd");
      }

      const wineData = {
        ...values,
        drinkingStatus: drinkingWindowType,
        drinkingWindowStart,
        drinkingWindowEnd,
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
      queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
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
    <div className="p-1">
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wine Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cabernet Sauvignon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="producer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Château Margaux" {...field} />
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
                        <Input placeholder="e.g. Napa Valley, Bordeaux" {...field} />
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
                        <Input placeholder="e.g. St. Helena, Pauillac" {...field} />
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
                        <Input placeholder="e.g. Cabernet Sauvignon, Merlot" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            onSelect={field.onChange}
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
                    name="drinkingWindowStart"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Drinking From</FormLabel>
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
                              onSelect={field.onChange}
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
                    name="drinkingWindowEnd"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Drink By</FormLabel>
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
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={onSuccess}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : wine ? "Update Wine" : "Add to Cellar"}
                </Button>
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
