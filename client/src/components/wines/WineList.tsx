import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import WineListItem from "./WineListItem";
import WineListHeader from "./WineListHeader";
import SpreadsheetView from "./SpreadsheetView";
import { WineFilters } from "./WineFilters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table2, LayoutGrid, Search, Filter } from "lucide-react";

const sortWines = (wines: Wine[], sortBy: string): Wine[] => {
  const sortedWines = [...wines];
  
  switch (sortBy) {
    case 'name-asc':
      return sortedWines.sort((a, b) => `${a.producer} ${a.name}`.localeCompare(`${b.producer} ${b.name}`));
    case 'name-desc':
      return sortedWines.sort((a, b) => `${b.producer} ${b.name}`.localeCompare(`${a.producer} ${a.name}`));
    case 'vintage-asc':
      return sortedWines.sort((a, b) => (a.vintage || 0) - (b.vintage || 0));
    case 'vintage-desc':
      return sortedWines.sort((a, b) => (b.vintage || 0) - (a.vintage || 0));
    case 'value-asc':
      return sortedWines.sort((a, b) => (a.currentValue || 0) - (b.currentValue || 0));
    case 'value-desc':
      return sortedWines.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    default:
      return sortedWines;
  }
};

interface WineListProps {
  defaultView?: 'card' | 'spreadsheet';
}

export default function WineList({ defaultView = 'card' }: WineListProps) {
  const [sortBy, setSortBy] = useState('default');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'spreadsheet'>(defaultView);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  const { data: wines, isLoading, refetch } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines', 'in_cellar'],
    queryFn: async () => {
      const response = await fetch(`/api/wines?consumedStatus=in_cellar`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch wines');
      }
      return response.json();
    }
  });
  
  // Mutation for updating wines in spreadsheet view
  const updateWineMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Wine> }) => {
      return fetch(`/api/wines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wines', 'in_cellar'] });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-32 mb-6" />
        
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!wines || wines.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 text-center">
        <h2 className="text-xl font-montserrat font-semibold mb-4 text-burgundy-700">My Cellar</h2>
        <p className="text-gray-600">Your cellar is empty. Add some wines to get started!</p>
      </div>
    );
  }

  // Filter wines by search query
  const filteredWines = wines.filter(wine => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      (wine.name && wine.name.toLowerCase().includes(searchLower)) ||
      (wine.producer && wine.producer.toLowerCase().includes(searchLower)) ||
      (wine.region && wine.region.toLowerCase().includes(searchLower)) ||
      (wine.grapeVarieties && wine.grapeVarieties.toLowerCase().includes(searchLower))
    );
  });

  // Sort filtered wines
  const sortedWines = sortWines(filteredWines, sortBy);
  
  // Calculate total bottles
  const totalBottles = sortedWines.reduce((sum, wine) => sum + (wine.quantity || 0), 0);
  
  // Calculate data for filters
  const typeCounts = sortedWines.reduce((counts: Record<string, number>, wine) => {
    const type = wine.type || 'Other';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  
  const regionCounts = sortedWines.reduce((counts: Record<string, number>, wine) => {
    const region = wine.region || 'Unknown';
    counts[region] = (counts[region] || 0) + 1;
    return counts;
  }, {});
  
  const vintageCounts = sortedWines.reduce((counts: Record<string, number>, wine) => {
    const vintage = wine.vintage?.toString() || 'Unknown';
    counts[vintage] = (counts[vintage] || 0) + 1;
    return counts;
  }, {});
  
  // Pagination
  const totalPages = Math.ceil(sortedWines.length / itemsPerPage);
  const currentWines = sortedWines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      {/* Sidebar Filters */}
      <WineFilters
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
        onFilterChange={() => {}} // We'll implement this later
        totalCount={sortedWines.length}
        regionCounts={regionCounts}
        typeCounts={typeCounts}
        vintageCounts={vintageCounts}
      />
      
      <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${showFilters ? 'ml-64' : ''} transition-all duration-300`}>
        {/* Filter button for mobile/tablet */}
        <Button
          variant="outline"
          size="sm"
          className="m-4 border-gray-200"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        
        <div className="border-t border-gray-100">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {viewMode === 'card' && (
              <>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedWines.length)} of {sortedWines.length} wines</>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <Select onValueChange={setSortBy} defaultValue="default">
              <SelectTrigger className="w-[180px] border-gray-200">
                <SelectValue placeholder="Sort by Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Sort by Default</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
                <SelectItem value="name-desc">Name: Z-A</SelectItem>
                <SelectItem value="vintage-desc">Vintage: Newest First</SelectItem>
                <SelectItem value="vintage-asc">Vintage: Oldest First</SelectItem>
                <SelectItem value="value-desc">Value: High to Low</SelectItem>
                <SelectItem value="value-asc">Value: Low to High</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex rounded-md overflow-hidden border border-gray-200">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-none ${viewMode === 'card' ? 'bg-burgundy-600 hover:bg-burgundy-700' : ''}`}
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid size={16} />
              </Button>
              <Button
                variant={viewMode === 'spreadsheet' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-none ${viewMode === 'spreadsheet' ? 'bg-burgundy-600 hover:bg-burgundy-700' : ''}`}
                onClick={() => setViewMode('spreadsheet')}
              >
                <Table2 size={16} />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSearchVisible(true)}
              className="h-10 w-10 border-gray-200"
            >
              <Search className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Search</span>
            </Button>
          </div>
        </div>
      </div>
      
      {viewMode === 'card' ? (
        <div className="p-6 border-t border-gray-100">
          <div className="grid gap-6">
            {currentWines.map((wine) => (
              <WineListItem key={wine.id} wine={wine} onUpdate={() => refetch()} />
            ))}
          </div>
          
          {currentWines.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">No wines match your current filters.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 text-gray-600"
                onClick={() => {
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-100">
          <SpreadsheetView 
            wines={sortedWines} 
            onWineUpdate={(id, data) => {
              updateWineMutation.mutate({ id, data });
            }}
          />
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 flex justify-center border-t border-gray-100">
          <nav className="flex items-center gap-1">
            <Button 
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-gray-200"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="sr-only">Previous</span>
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "outline"}
                size="sm"
                className={`h-8 w-8 rounded-full border-gray-200 p-0 ${
                  pageNum === currentPage
                    ? 'bg-burgundy-600 hover:bg-burgundy-700'
                    : 'text-gray-600 hover:bg-cream-50'
                }`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </Button>
            ))}
            
            <Button 
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-gray-200"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="sr-only">Next</span>
            </Button>
          </nav>
        </div>
      )}
      
      {/* Search Dialog */}
      <Dialog open={searchVisible} onOpenChange={setSearchVisible}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-medium text-gray-800">Search Wines</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label htmlFor="search-query" className="text-sm text-gray-500 block mb-2">
                Search your collection
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="search-query"
                  placeholder="Wine name, producer, region, or grape variety"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Search results will update as you type.
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="border-gray-200 text-gray-600"
                onClick={() => {
                  setSearchQuery('');
                  setSearchVisible(false);
                }}
              >
                Reset
              </Button>
              <Button 
                size="sm"
                className="bg-burgundy-600 hover:bg-burgundy-700 text-white"
                onClick={() => {
                  setCurrentPage(1);
                  setSearchVisible(false);
                }}
              >
                Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
