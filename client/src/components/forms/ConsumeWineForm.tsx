import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Wine } from "@shared/schema";

const formSchema = z.object({
  wineId: z.number().positive("Please select a wine"),
  consumptionDate: z.date(),
  quantity: z.number().min(1, "Must consume at least 1 bottle"),
  notes: z.string().optional(),
  rating: z.number().min(1).max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ConsumeWineFormProps {
  onSuccess?: () => void;
}

export default function ConsumeWineForm({ onSuccess }: ConsumeWineFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredWines, setFilteredWines] = useState<Wine[]>([]);

  const { data: wines, isLoading } = useQuery<Wine[]>({
    queryKey: ['/api/wines'],
  });
  
  // Initialize filtered wines when data loads
  useEffect(() => {
    if (wines) {
      const available = wines.filter(w => w.quantity && w.quantity > 0);
      setFilteredWines(available);
    }
  }, [wines]);

  const defaultValues: Partial<FormValues> = {
    consumptionDate: new Date(),
    quantity: 1,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedWineId = form.watch("wineId");
  const selectedWine = wines?.find(wine => wine.id === selectedWineId);
  
  // Update quantity when wine selection changes
  if (selectedWine && selectedWine.quantity !== null) {
    const currentQuantity = form.getValues("quantity") || 0;
    if (!currentQuantity || currentQuantity > selectedWine.quantity) {
      form.setValue("quantity", Math.min(selectedWine.quantity, 1));
    }
  }

  async function onSubmit(values: FormValues) {
    if (!selectedWine) return;
    
    setIsSubmitting(true);
    try {
      // Create consumption record
      await apiRequest("POST", "/api/consumptions", {
        ...values,
        userId: 1 // Using default user ID in this example
      });

      toast({
        title: "Wine Consumed",
        description: `${values.quantity} bottle${values.quantity > 1 ? 's' : ''} of ${selectedWine.producer} ${selectedWine.name} marked as consumed.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/consumptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      form.reset();
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

  if (isLoading) {
    return <div className="text-center p-4">Loading your wines...</div>;
  }

  if (!wines || wines.length === 0) {
    return (
      <div className="text-center p-4">
        <p>You don't have any wines in your cellar yet.</p>
        <Button className="mt-4" onClick={onSuccess}>Close</Button>
      </div>
    );
  }

  const availableWines = wines.filter(wine => wine.quantity !== null && wine.quantity > 0);

  if (availableWines.length === 0) {
    return (
      <div className="text-center p-4">
        <p>All your wines are currently marked as consumed.</p>
        <Button className="mt-4" onClick={onSuccess}>Close</Button>
      </div>
    );
  }

  return (
    <div className="p-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="wineId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Wine</FormLabel>
                <div className="relative">
                  <input 
                    type="text" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Type to search wines in your cellar"
                    value={field.value ? availableWines.find(w => w.id === field.value)?.producer + ' ' + (availableWines.find(w => w.id === field.value)?.name || '') : ''}
                    onChange={(e) => {
                      // On text change, don't update the field yet, just filter the list
                      setFilteredWines(availableWines.filter(wine => 
                        `${wine.vintage} ${wine.producer} ${wine.name || ''}`
                          .toLowerCase()
                          .includes(e.target.value.toLowerCase())
                      ));
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setFilteredWines(availableWines);
                      setShowSuggestions(true);
                    }}
                  />
                  
                  {showSuggestions && (
                    <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                      {filteredWines.map(wine => (
                        <li 
                          key={wine.id}
                          className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            field.onChange(wine.id);
                            setShowSuggestions(false);
                          }}
                        >
                          {wine.vintage} {wine.producer} {wine.name} ({wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''})
                        </li>
                      ))}
                      {filteredWines.length === 0 && (
                        <li className="px-4 py-2 text-sm text-gray-500">No wines found</li>
                      )}
                    </ul>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="consumptionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Consumption Date</FormLabel>
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
                          format(field.value, "PPP")
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
                      selected={field.value}
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
                    max={selectedWine?.quantity || 1}
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    disabled={!selectedWine}
                  />
                </FormControl>
                {selectedWine && (
                  <p className="text-xs text-muted-foreground">
                    You have {selectedWine.quantity} bottle{selectedWine.quantity !== 1 ? 's' : ''} available
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating (1-100)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    max="100"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tasting Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add your tasting notes about this wine..." 
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
            <Button type="submit" disabled={isSubmitting || !selectedWine}>
              {isSubmitting ? "Processing..." : "Mark as Consumed"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
