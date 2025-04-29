import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import WineListItem from "./WineListItem";
import WineListHeader from "./WineListHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function ConsumedWinesList() {
  const [sortBy, setSortBy] = useState('date-desc');

  // Fetch consumed wines
  const { data: wines, isLoading } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines', 'consumed'],
    queryFn: async () => {
      const response = await fetch(`/api/wines?consumedStatus=consumed`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch consumed wines');
      }
      return response.json();
    }
  });

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

  if (!wines || wines.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 text-center">
        <h2 className="text-xl font-montserrat font-semibold mb-4 text-burgundy-700">Consumed Wines</h2>
        <p className="text-gray-600">No wines have been consumed yet. Mark some wines as consumed to see them here.</p>
      </div>
    );
  }

  // Sort consumed wines
  const sortedWines = [...wines].sort((a, b) => {
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-8">
      <WineListHeader
        title="Consumed Wines"
        count={sortedWines.reduce((total, wine) => total + (wine.quantity || 1), 0)}
        totalWines={sortedWines.length}
        onSortChange={setSortBy}
        onSearchClick={() => {}}
      />
      
      {/* Total count of wines and bottles */}
      <div className="text-sm text-gray-600 mb-4 italic">
        {sortedWines.length} wine{sortedWines.length !== 1 ? 's' : ''}, {sortedWines.reduce((total, wine) => total + (wine.quantity || 1), 0)} bottle{sortedWines.reduce((total, wine) => total + (wine.quantity || 1), 0) !== 1 ? 's' : ''}
      </div>

      <div className="space-y-3 mt-4">
        {sortedWines.map((wine) => (
          <div key={wine.id} className="border border-cream-200 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <div>
                <h3 className="font-medium">
                  {wine.vintage} {wine.producer} {wine.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {wine.type} · {wine.region} {wine.subregion ? `(${wine.subregion})` : ''}
                  {wine.quantity && wine.quantity > 1 ? ` · ${wine.quantity} bottles` : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Consumed on</div>
                <div className="font-medium">{formatDate(wine.createdAt)}</div>
              </div>
            </div>
            
            {wine.notes && (
              <div className="mt-2 p-3 bg-cream-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Tasting Notes:</div>
                <div className="text-sm">{wine.notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}