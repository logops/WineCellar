import { useState, useEffect } from "react";
import TabNavigation from "@/components/ui/TabNavigation";
import WineList from "@/components/wines/WineList";
import ConsumedWinesList from "@/components/wines/ConsumedWinesList";
import CollectionDashboard from "@/components/dashboard/CollectionDashboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddWineForm from "@/components/forms/AddWineForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

export default function Collection() {
  const [showAddWineModal, setShowAddWineModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'in-cellar' | 'consumed'>('in-cellar');
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Get statistics data
  const { data: statistics } = useQuery({ 
    queryKey: ['/api/statistics'],
    queryFn: async () => {
      const response = await fetch('/api/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      return response.json();
    }
  });
  
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
          <h1 className="text-2xl font-serif font-medium text-gray-800">My Wine Collection</h1>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className={`text-burgundy-600 border-burgundy-200 ${showDashboard ? 'bg-cream-100' : ''}`}
              size="sm"
              onClick={() => setShowDashboard(!showDashboard)}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button 
              onClick={() => setShowAddWineModal(true)}
              className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Wine
            </Button>
          </div>
        </div>
        
        {/* Dashboard View - shown conditionally */}
        {showDashboard && statistics && (
          <CollectionDashboard 
            statistics={{
              inCellar: statistics.inCellar || 0,
              totalWines: statistics.totalWines || 0,
              consumed: statistics.consumed || 0,
              purchased: statistics.purchased || 0,
              redCount: statistics.redCount || 0,
              whiteCount: statistics.whiteCount || 0,
              sparklingCount: statistics.sparklingCount || 0,
              otherCount: statistics.otherCount || 0,
              totalValue: statistics.totalValue || 0,
              averageRating: statistics.averageRating || 0,
              readyToDrink: statistics.readyToDrink || 0
            }}
          />
        )}
        
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
            <WineList defaultView="spreadsheet" />
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
