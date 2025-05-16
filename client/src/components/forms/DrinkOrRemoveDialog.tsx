import { useState } from "react";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Wine } from "@shared/schema";
import RemoveByLabel from "../wines/RemoveByLabel";

interface DrinkOrRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wine?: Wine | null;
  onComplete?: () => void;
}

export default function DrinkOrRemoveDialog({ 
  open, 
  onOpenChange, 
  wine, 
  onComplete 
}: DrinkOrRemoveDialogProps) {
  const [activeAction, setActiveAction] = useState<'consume' | 'remove' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("single");

  // Reset state when dialog opens or closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setActiveAction(null);
      setNotes("");
      setActiveTab("single");
    }
    onOpenChange(open);
  };

  const handleConsumeWine = async () => {
    if (!wine?.id) return;
    
    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/wines/remove", {
        id: wine.id,
        status: 'consumed',
        quantity: 1, // For now, always consume 1 bottle at a time
        notes: notes.trim() || undefined
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Wine Consumed",
          description: `1 bottle of ${wine.producer} ${wine.name || ""} marked as consumed.`,
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
        queryClient.invalidateQueries({ queryKey: ['/api/consumptions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
        
        // Close the dialog
        handleOpenChange(false);
        
        // Call completion callback if provided
        if (onComplete) onComplete();
      } else {
        throw new Error(result.error || "Failed to consume wine");
      }
    } catch (error) {
      console.error("Error consuming wine:", error);
      toast({
        title: "Error",
        description: "There was a problem marking the wine as consumed.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveWine = async () => {
    if (!wine?.id) return;
    
    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/wines/remove", {
        id: wine.id,
        status: 'removed',
        quantity: 1,
        notes: notes.trim() || undefined
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Wine Removed",
          description: `${wine.producer} ${wine.name || ""} has been removed from your cellar.`,
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
        
        // Close the dialog
        handleOpenChange(false);
        
        // Call completion callback if provided
        if (onComplete) onComplete();
      } else {
        throw new Error(result.error || "Failed to remove wine");
      }
    } catch (error) {
      console.error("Error removing wine:", error);
      toast({
        title: "Error",
        description: "There was a problem removing the wine from your cellar.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionComplete = () => {
    handleOpenChange(false);
    if (onComplete) onComplete();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-serif">Drink or Remove Wine</AlertDialogTitle>
          <AlertDialogDescription>
            Track consumption or remove wines from your cellar
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-2">
          <Tabs 
            defaultValue="single" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Remove Single Wine</TabsTrigger>
              <TabsTrigger value="by-label">Remove by Label</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="mt-4">
              {wine ? (
                <>
                  <div className="mb-4">
                    <h3 className="font-medium text-lg">
                      {wine.vintage && `${wine.vintage} `}
                      {wine.producer} {wine.name || ""}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  
                  {activeAction === null ? (
                    <div className="space-y-4">
                      <div 
                        className="p-4 border rounded-md hover:bg-cream-50 hover:border-burgundy-300 cursor-pointer transition-colors"
                        onClick={() => setActiveAction('consume')}
                      >
                        <h4 className="font-medium mb-1 text-burgundy-700">Mark as Consumed</h4>
                        <p className="text-sm text-gray-600">
                          Decreases quantity by 1 and creates a consumption record with tasting notes.
                        </p>
                      </div>
                      
                      <div 
                        className="p-4 border rounded-md hover:bg-cream-50 hover:border-burgundy-300 cursor-pointer transition-colors"
                        onClick={() => setActiveAction('remove')}
                      >
                        <h4 className="font-medium mb-1 text-burgundy-700">Remove from Cellar</h4>
                        <p className="text-sm text-gray-600">
                          Removes wine from your collection without creating a consumption record (for gifts, damaged bottles, etc.)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {activeAction === 'consume' ? 'Tasting Notes' : 'Reason for Removal'} (Optional)
                        </label>
                        <Textarea
                          placeholder={
                            activeAction === 'consume'
                              ? "Add your tasting notes about this wine..."
                              : "Add a reason for removing this wine (e.g., gifted, damaged bottle)..."
                          }
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveAction(null)}
                          disabled={isProcessing}
                        >
                          Back
                        </Button>
                        
                        <Button
                          type="button"
                          variant={activeAction === 'consume' ? 'default' : 'destructive'}
                          onClick={activeAction === 'consume' ? handleConsumeWine : handleRemoveWine}
                          disabled={isProcessing}
                        >
                          {isProcessing
                            ? "Processing..."
                            : activeAction === 'consume'
                            ? "Mark as Consumed"
                            : "Remove Wine"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No wine selected. Please select a wine first.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="by-label" className="mt-4">
              <RemoveByLabel onComplete={handleActionComplete} />
            </TabsContent>
          </Tabs>
        </div>
        
        <AlertDialogFooter>
          {activeTab === "single" && activeAction === null && (
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}