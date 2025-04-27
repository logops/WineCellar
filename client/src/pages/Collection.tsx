import { useState } from "react";
import TabNavigation from "@/components/ui/TabNavigation";
import WineList from "@/components/wines/WineList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "@/components/forms/AddWineForm";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Collection() {
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  
  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "My Notes", href: "/notes" },
    { label: "Statistics", href: "/statistics" },
  ];

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="My Cellar" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-montserrat font-semibold text-burgundy-700">My Collection</h1>
          <Button onClick={() => setShowAddWineModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Wine
          </Button>
        </div>
        
        <WineList />
      </div>

      {/* Add Wine Dialog */}
      <Dialog open={showAddWineModal} onOpenChange={setShowAddWineModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Wine to My Cellar</DialogTitle>
          </DialogHeader>
          <AddWineForm onSuccess={() => setShowAddWineModal(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
