import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wishlist } from "@shared/schema";
import TabNavigation from "@/components/ui/TabNavigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WishlistForm from "@/components/forms/WishlistForm";
import WishlistItem from "@/components/wishlist/WishlistItem";
import { Skeleton } from "@/components/ui/skeleton";

export default function WishList() {
  const [showAddModal, setShowAddModal] = useState(false);
  
  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "My Notes", href: "/notes" },
    { label: "Statistics", href: "/statistics" },
  ];
  
  const { data: wishlistItems, isLoading, refetch } = useQuery<Wishlist[]>({
    queryKey: ['/api/wishlist'],
  });

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="My Wish List" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif font-medium text-burgundy-700">My Wish List</h1>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add to Wish List
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : wishlistItems && wishlistItems.length > 0 ? (
            <div className="space-y-4">
              {wishlistItems.map(item => (
                <WishlistItem 
                  key={item.id} 
                  item={item} 
                  onUpdate={() => refetch()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-burgundy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-medium mb-2">Your Wish List is Empty</h3>
              <p className="text-gray-600 mb-6 font-elegant">Add wines you'd like to acquire in the future</p>
              <Button onClick={() => setShowAddModal(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Wish List Wine
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Wishlist Item Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Wine to Wish List</DialogTitle>
          </DialogHeader>
          <WishlistForm 
            onSuccess={() => {
              setShowAddModal(false);
              refetch();
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
