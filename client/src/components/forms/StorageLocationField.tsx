import { useState } from "react";
import { 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useCellars } from "@/hooks/use-cellars";
import { UseFormReturn } from "react-hook-form";

interface StorageLocationFieldProps {
  form: UseFormReturn<any>;
}

export default function StorageLocationField({ form }: StorageLocationFieldProps) {
  const { cellars, addCellar } = useCellars();
  const [showCustomCellar, setShowCustomCellar] = useState(false);
  const [customCellar, setCustomCellar] = useState("");

  const handleAddCustomCellar = () => {
    if (customCellar.trim() !== "") {
      addCellar(customCellar.trim());
      form.setValue("storageLocation", customCellar.trim());
      setCustomCellar("");
      setShowCustomCellar(false);
    }
  };

  return (
    <div className="border rounded-md p-4 mb-6">
      <h3 className="text-lg font-medium mb-4">Storage Location</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="storageLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cellar</FormLabel>
              <div className="flex flex-col space-y-2">
                {!showCustomCellar ? (
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          if (value === "add_custom") {
                            setShowCustomCellar(true);
                          } else {
                            field.onChange(value);
                          }
                        }}
                        defaultValue={field.value || "Main Cellar"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a cellar" />
                        </SelectTrigger>
                        <SelectContent>
                          {cellars.map((cellar) => (
                            <SelectItem key={cellar} value={cellar}>
                              {cellar}
                            </SelectItem>
                          ))}
                          <SelectItem value="add_custom" className="text-primary">
                            <div className="flex items-center">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Custom Location
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Enter custom cellar name"
                        value={customCellar}
                        onChange={(e) => setCustomCellar(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddCustomCellar}
                        disabled={!customCellar.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCustomCellar(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <FormDescription>
                Choose a cellar or create a custom storage location
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="binNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bin/Box Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. A12, Box 3, Rack 2"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Specify bin, box, or rack where this wine is stored
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}