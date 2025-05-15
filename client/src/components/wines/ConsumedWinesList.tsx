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
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-32 mb-6" />
        
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!consumptions || consumptions.length === 0 || !allWines || allWines.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 text-center">
        <h2 className="text-xl font-montserrat font-semibold mb-4 text-burgundy-700">Consumed Wines</h2>
        <p className="text-gray-600">No wines have been consumed yet. Mark some wines as consumed to see them here.</p>
      </div>
    );
  }

  // Create a map of wine IDs to wine details
  const wineMap = new Map<number, Wine>();
  allWines.forEach(wine => {
    wineMap.set(wine.id, wine);
  });
  
  // Create consumption records with wine details
  const consumedWines = consumptions.map(consumption => {
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-8">
      <WineListHeader
        title="Consumed Wines"
        count={totalBottles} // Total consumed bottles
        totalWines={uniqueWineIds.size} // Unique wine count
        onSortChange={setSortBy}
        onSearchClick={() => {}}
      />
      
      {/* Total count of wines and bottles */}
      <div className="text-sm text-gray-600 mb-4 italic">
        {uniqueWineIds.size} wine{uniqueWineIds.size !== 1 ? 's' : ''}, {totalBottles} bottle{totalBottles !== 1 ? 's' : ''}
      </div>

      <div className="space-y-3 mt-4">
        {sortedWines.map((consumption) => (
          <div key={consumption.id} className="border border-cream-200 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <div>
                <h3 className="font-medium">
                  {consumption.vintage} {consumption.producer} {consumption.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {consumption.type} · {consumption.region} {consumption.subregion ? `(${consumption.subregion})` : ''}
                  {consumption.quantity && consumption.quantity > 1 ? ` · ${consumption.quantity} bottles` : '1 bottle'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Consumed on</div>
                <div className="font-medium">{formatDate(consumption.consumptionDate || consumption.createdAt)}</div>
              </div>
            </div>
            
            {consumption.notes && (
              <div className="mt-2 p-3 bg-cream-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Tasting Notes:</div>
                <div className="text-sm">{consumption.notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}