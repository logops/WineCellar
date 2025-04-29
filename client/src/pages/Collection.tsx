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
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif font-medium text-gray-800">My Wine Collection</h1>
          <Button 
            onClick={() => setShowAddWineModal(true)}
            className="bg-burgundy-600 hover:bg-burgundy-700 text-white font-medium"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Wine
          </Button>
        </div>
        
        {/* Summary Card - Similar to the example design */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-medium text-gray-700 mb-2">Collection Summary</h2>
          <p className="text-gray-500 text-sm mb-6">Overview of your wine cellar</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Bottles</p>
              <p className="text-3xl font-medium text-gray-800">86</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Value</p>
              <p className="text-3xl font-medium text-gray-800">$4,320</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Average Rating</p>
              <p className="text-3xl font-medium text-gray-800">92<span className="text-base text-gray-500">/100</span></p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Drinking Window</p>
              <p className="text-3xl font-medium text-gray-800">24<span className="text-base text-gray-500"> bottles ready</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8 pt-6 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500 mb-1">Red</p>
              <p className="text-2xl font-medium text-gray-800">58<span className="text-sm text-gray-500 ml-1">bottles</span></p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">White</p>
              <p className="text-2xl font-medium text-gray-800">16<span className="text-sm text-gray-500 ml-1">bottles</span></p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Sparkling</p>
              <p className="text-2xl font-medium text-gray-800">8<span className="text-sm text-gray-500 ml-1">bottles</span></p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Dessert</p>
              <p className="text-2xl font-medium text-gray-800">4<span className="text-sm text-gray-500 ml-1">bottles</span></p>
            </div>
          </div>
        </div>
        
        <Tabs 
          defaultValue="in-cellar" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'in-cellar' | 'consumed')}
          className="mb-6"
        >
          <TabsList className="space-x-1 bg-cream-100 p-1 rounded-lg mb-6">
            <TabsTrigger 
              value="in-cellar" 
              className="data-[state=active]:bg-white data-[state=active]:text-burgundy-700 rounded-md transition-all"
            >
              Collection
            </TabsTrigger>
            <TabsTrigger 
              value="consumed"
              className="data-[state=active]:bg-white data-[state=active]:text-burgundy-700 rounded-md transition-all"  
            >
              Recent Activity
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="in-cellar" className="pt-4 animate-in fade-in-50">
            <WineList />
          </TabsContent>
          
          <TabsContent value="consumed" className="pt-4 animate-in fade-in-50">
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
