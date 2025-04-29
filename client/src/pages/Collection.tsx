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
          <Button 
            onClick={() => setShowAddWineModal(true)}
            className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Wine
          </Button>
        </div>
        
        {/* Toggle Buttons */}
        <div className="mb-6 flex flex-col space-y-3">
          <div className="inline-flex p-1 bg-cream-50 rounded-md self-start">
            <Button 
              variant={activeTab === 'in-cellar' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('in-cellar')}
              className="rounded-sm px-4 py-1"
              size="sm"
            >
              Collection
            </Button>
            <Button 
              variant={activeTab === 'consumed' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('consumed')}
              className="rounded-sm px-4 py-1"
              size="sm"
            >
              Recent Activity
            </Button>
          </div>
          
          <div className="inline-flex p-1 bg-cream-50 rounded-md self-start">
            <Button 
              variant={!showDashboard ? 'secondary' : 'ghost'}
              onClick={() => setShowDashboard(false)}
              className="rounded-sm px-4 py-1"
              size="sm"
            >
              My Wines
            </Button>
            <Button 
              variant={showDashboard ? 'secondary' : 'ghost'}
              onClick={() => setShowDashboard(true)}
              className="rounded-sm px-4 py-1"
              size="sm"
            >
              Dashboard
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
        
        {/* Main Content */}
        <div className="animate-in fade-in-50">
          {activeTab === 'in-cellar' && !showDashboard && (
            <WineList defaultView="spreadsheet" />
          )}
          
          {activeTab === 'consumed' && !showDashboard && (
            <ConsumedWinesList />
          )}
        </div>
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
