import { useState } from "react";
import { Wishlist } from "@shared/schema";
import WineGlassIcon from "../wines/WineGlassIcon";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreVertical, ShoppingCart, Trash2 } from "lucide-react";
import AddWineForm from "../forms/AddWineForm";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WishlistItemProps {
  item: Wishlist;
  onUpdate: () => void;
}

export default function WishlistItem({ item, onUpdate }: WishlistItemProps) {
  const { toast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/wishlist/${item.id}`, undefined);
      
      toast({
        title: "Wish List Item Removed",
        description: "The wine has been removed from your wish list."
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      onUpdate();
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      toast({
        title: "Error",
        description: "There was a problem removing the wine from your wish list.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  return (
    <div className="border rounded-md p-4 hover:bg-cream-50">
      <div className="flex">
        <div className="w-8 flex-shrink-0 mr-3">
          <WineGlassIcon type={item.type || "red"} />
        </div>
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="font-medium text-burgundy-700">
                {item.vintage && `${item.vintage} `}{item.producer} {item.name}
              </h3>
              <p className="text-gray-600 text-sm">
                {item.region}
                {item.subregion && `, ${item.subregion}`}
              </p>
              <p className="text-gray-600 text-sm italic mt-1">
                {item.type && getWineTypeName(item.type)}
              </p>
            </div>
            <div className="mt-2 md:mt-0 flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowAddToCollectionModal(true)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Collection
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteAlert(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {item.notes && (
            <div className="mt-3 bg-cream-50 p-3 rounded-md text-sm">
              <p className="text-gray-700">{item.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Wish List?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {item.vintage && `${item.vintage} `}{item.producer} {item.name} from your wish list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Collection Dialog */}
      <Dialog open={showAddToCollectionModal} onOpenChange={setShowAddToCollectionModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to Your Collection</DialogTitle>
          </DialogHeader>
          <AddWineForm 
            onSuccess={() => {
              setShowAddToCollectionModal(false);
              toast({
                title: "Wine Added",
                description: "The wine has been added to your collection."
              });
            }}
            wine={{
              id: 0,
              name: item.name,
              producer: item.producer || "",
              vintage: item.vintage || undefined,
              type: item.type || "red",
              region: item.region || "",
              subregion: item.subregion || "",
              grapeVarieties: "",
              bottleSize: "750ml",
              quantity: 1,
              purchasePrice: undefined,
              currentValue: undefined,
              purchaseDate: new Date(),
              purchaseLocation: "",
              rating: undefined,
              drinkingWindowStart: undefined,
              drinkingWindowEnd: undefined,
              drinkingStatus: "drink_later",
              notes: item.notes || "",
              createdAt: new Date(),
              userId: 1
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to get readable wine type names
function getWineTypeName(type: string): string {
  switch (type) {
    case 'red': return 'Red Wine';
    case 'white': return 'White Wine';
    case 'rose': return 'Rosé';
    case 'sparkling': return 'Sparkling Wine';
    case 'dessert': return 'Dessert Wine';
    case 'fortified': return 'Fortified Wine';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
