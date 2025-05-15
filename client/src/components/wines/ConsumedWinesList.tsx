import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import WineListItem from "./WineListItem";
import WineListHeader from "./WineListHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConsumedWinesList() {
  const [sortBy, setSortBy] = useState('date-desc');
  const [activeTab, setActiveTab] = useState('consumed');

  // Fetch all consumption records
  const { data: consumptions, isLoading: consumpionsLoading } = useQuery<any[]>({ 
    queryKey: ['/api/consumptions'],
    queryFn: async () => {
      const response = await fetch(`/api/consumptions`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch consumptions');
      }
      return response.json();
    }
  });
  
  // Fetch all wines
  const { data: allWines, isLoading: winesLoading } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/wines?consumedStatus=all', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch wines');
      }
      return response.json();
    }
  });

  // Handle loading state for both data sets
  const isLoading = consumpionsLoading || winesLoading;
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-[300px]" />
        </div>
        
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Use default empty arrays if data is missing
  const safeConsumptions = consumptions || [];
  const safeAllWines = allWines || [];

  // Create a map of wine IDs to wine details
  const wineMap = new Map<number, Wine>();
  safeAllWines.forEach(wine => {
    wineMap.set(wine.id, wine);
  });
  
  // Create consumption records with wine details
  const consumedWines = safeConsumptions.map(consumption => {
    const wine = wineMap.get(consumption.wineId);
    return {
      ...consumption,
      wine,
      // Additional needed properties
      id: consumption.id,
      vintage: wine?.vintage,
      producer: wine?.producer,
      name: wine?.name || "",
      type: wine?.type,
      region: wine?.region,
      subregion: wine?.subregion,
      notes: consumption.notes || wine?.notes,
    };
  }).filter(item => item.wine !== undefined); // Filter out consumptions for which we couldn't find the wine
  
  // Sort consumed wines
  const sortedWines = [...consumedWines].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    
    switch (sortBy) {
      case 'date-asc':
        return dateA - dateB;
      case 'date-desc':
        return dateB - dateA;
      case 'name-asc':
        return `${a.producer} ${a.name}`.localeCompare(`${b.producer} ${b.name}`);
      case 'name-desc':
        return `${b.producer} ${b.name}`.localeCompare(`${a.producer} ${a.name}`);
      case 'vintage-asc':
        return (a.vintage || 0) - (b.vintage || 0);
      case 'vintage-desc':
        return (b.vintage || 0) - (a.vintage || 0);
      default:
        return dateB - dateA;
    }
  });

  // Count unique wines consumed (by ID) and total bottles
  const uniqueWineIds = new Set(sortedWines.map(item => item.wineId));
  const totalBottles = sortedWines.reduce((total, item) => total + (item.quantity || 1), 0);

  // Sort wines by creation date to get recently imported wines
  // Only show wines that are still in the cellar (not consumed)
  const recentlyImportedWines = [...safeAllWines]
    .filter(wine => !wine.consumed) // Only show wines that are still in the cellar
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // newest first
    })
    .slice(0, 10); // Only show the 10 most recently added wines

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-serif font-semibold text-burgundy-700">Recent Activity</h2>
        <div className="ml-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[300px]">
            <TabsList className="bg-cream-100">
              <TabsTrigger value="consumed" className="font-elegant">
                Consumed
              </TabsTrigger>
              <TabsTrigger value="imported" className="font-elegant">
                Recently Added
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <TabsContent value="consumed" className="mt-0">
        {/* Total count of wines and bottles */}
        <div className="text-sm text-gray-600 mb-4 italic">
          {uniqueWineIds.size} wine{uniqueWineIds.size !== 1 ? 's' : ''}, {totalBottles} bottle{totalBottles !== 1 ? 's' : ''}
        </div>

        {sortedWines.length > 0 ? (
          <div className="space-y-3 mt-4">
            {sortedWines.map((consumption) => (
              <div key={consumption.id} className="border border-cream-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <h3 className="font-medium font-serif">
                      {consumption.vintage} {consumption.producer} {consumption.name}
                    </h3>
                    <p className="text-gray-600 text-sm font-elegant">
                      {consumption.type} · {consumption.region} {consumption.subregion ? `(${consumption.subregion})` : ''}
                      {consumption.quantity && consumption.quantity > 1 ? ` · ${consumption.quantity} bottles` : ' · 1 bottle'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 font-elegant">Consumed on</div>
                    <div className="font-medium font-elegant">{formatDate(consumption.consumptionDate || consumption.createdAt)}</div>
                  </div>
                </div>
                
                {consumption.notes && (
                  <div className="mt-2 p-3 bg-cream-50 rounded-md">
                    <div className="text-xs text-gray-500 mb-1 font-elegant">Tasting Notes:</div>
                    <div className="text-sm font-elegant">{consumption.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 font-elegant">No consumed wines yet. When you mark wines as consumed, they'll appear here.</p>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="imported" className="mt-0">
        {/* Recently Imported Wines */}
        <div className="text-sm text-gray-600 mb-4 italic">
          {recentlyImportedWines.length} recently added wine{recentlyImportedWines.length !== 1 ? 's' : ''}
        </div>

        {recentlyImportedWines.length > 0 ? (
          <div className="space-y-3 mt-4">
            {recentlyImportedWines.map((wine) => (
              <div key={wine.id} className="border border-cream-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <h3 className="font-medium font-serif">
                      {wine.vintage} {wine.producer} {wine.name}
                    </h3>
                    <p className="text-gray-600 text-sm font-elegant">
                      {wine.type} · {wine.region} {wine.subregion ? `(${wine.subregion})` : ''}
                      {wine.quantity && wine.quantity > 1 ? ` · ${wine.quantity} bottles` : ' · 1 bottle'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 font-elegant">Added on</div>
                    <div className="font-medium font-elegant">{formatDate(wine.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 font-elegant">No recently added wines. New wines you add to your collection will appear here.</p>
          </div>
        )}
      </TabsContent>
    </div>
  );
}