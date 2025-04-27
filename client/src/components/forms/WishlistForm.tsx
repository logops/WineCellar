import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wishlist, insertWishlistSchema } from "@shared/schema";

const formSchema = insertWishlistSchema.extend({
  vintage: z.coerce.number().min(1900).max(new Date().getFullYear() + 10).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WishlistFormProps {
  item?: Wishlist;
  onSuccess?: () => void;
}

export default function WishlistForm({ item, onSuccess }: WishlistFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<FormValues> = {
    name: item?.name || "",
    producer: item?.producer || "",
    vintage: item?.vintage || undefined,
    type: item?.type || "",
    region: item?.region || "",
    subregion: item?.subregion || "",
    notes: item?.notes || "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      // Add userId for the backend
      const wishlistData = {
        ...values,
        userId: 1 // Default user
      };

      // Create wishlist item
      await apiRequest("POST", "/api/wishlist", wishlistData);
      
      toast({
        title: "Wine Added to Wish List",
        description: `${values.vintage ? values.vintage + ' ' : ''}${values.producer} ${values.name} has been added to your wish list.`,
      });

      // Invalidate the wishlist query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error adding to wish list:", error);
      toast({
        title: "Error",
        description: "There was a problem adding the wine to your wish list.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-1">
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
          </div>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add any notes about why you want this wine or where to find it..." 
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
              {isSubmitting ? "Adding..." : "Add to Wish List"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
