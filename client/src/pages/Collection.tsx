import { useState, useEffect } from "react";
import TabNavigation from "@/components/ui/TabNavigation";
import WineList from "@/components/wines/WineList";
import ConsumedWinesList from "@/components/wines/ConsumedWinesList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "@/components/forms/AddWineForm";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Collection() {
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'in-cellar' | 'consumed'>('in-cellar');
  
  // Check URL hash to determine initial active tab
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#consumed') {
        setActiveTab('consumed');
      } else {
        setActiveTab('in-cellar');
      }
    };
    
    // Set initial tab based on current hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
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
        
        <Tabs 
          defaultValue="in-cellar" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'in-cellar' | 'consumed')}
          className="mb-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="in-cellar">In Cellar</TabsTrigger>
            <TabsTrigger value="consumed">Consumed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="in-cellar" className="pt-4">
            <WineList />
          </TabsContent>
          
          <TabsContent value="consumed" className="pt-4">
            <ConsumedWinesList />
          </TabsContent>
        </Tabs>
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
