import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import WineListItem from "./WineListItem";
import WineListHeader from "./WineListHeader";
import SpreadsheetView from "./SpreadsheetView";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table2, LayoutGrid } from "lucide-react";

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

export default function WineList() {
  const [sortBy, setSortBy] = useState('default');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'spreadsheet'>('card');
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
  
  // Pagination
  const totalPages = Math.ceil(sortedWines.length / itemsPerPage);
  const currentWines = sortedWines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-gray-800 mb-1">Wine Type</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 bg-cream-50 hover:bg-cream-100 text-gray-700 font-normal"
            >
              All <span className="ml-1 text-gray-500">(86)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              Red <span className="ml-1 text-gray-500">(58)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              White <span className="ml-1 text-gray-500">(16)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              Sparkling <span className="ml-1 text-gray-500">(8)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              Dessert <span className="ml-1 text-gray-500">(4)</span>
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-medium text-gray-800 mb-1">Region</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 bg-cream-50 hover:bg-cream-100 text-gray-700 font-normal"
            >
              All <span className="ml-1 text-gray-500">(86)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              France <span className="ml-1 text-gray-500">(42)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              Italy <span className="ml-1 text-gray-500">(18)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              USA <span className="ml-1 text-gray-500">(15)</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-4 py-1 border-gray-200 hover:bg-cream-100 text-gray-700 font-normal"
            >
              Spain <span className="ml-1 text-gray-500">(11)</span>
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-medium text-gray-800 mb-1">More Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <Select onValueChange={(val) => console.log(val)} defaultValue="vintage">
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="Vintage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vintage">Vintage</SelectItem>
                  <SelectItem value="2020">2020</SelectItem>
                  <SelectItem value="2019">2019</SelectItem>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2017">2017</SelectItem>
                  <SelectItem value="older">Older</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select onValueChange={(val) => console.log(val)} defaultValue="varietal">
                <SelectTrigger className="w-full border-gray-200">
                  <SelectValue placeholder="Varietal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="varietal">Varietal</SelectItem>
                  <SelectItem value="cabernet">Cabernet Sauvignon</SelectItem>
                  <SelectItem value="pinot">Pinot Noir</SelectItem>
                  <SelectItem value="chardonnay">Chardonnay</SelectItem>
                  <SelectItem value="sauvignon">Sauvignon Blanc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-600"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
      
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
        <>
          <div className="text-xs text-gray-500 mb-2">
            <span className="mr-4">Key: V - Value</span>
          </div>
          
          <div className="space-y-3">
            {currentWines.map((wine) => (
              <WineListItem key={wine.id} wine={wine} onUpdate={() => refetch()} />
            ))}
          </div>
        </>
      ) : (
        <SpreadsheetView 
          wines={sortedWines} 
          onWineUpdate={(id, data) => {
            updateWineMutation.mutate({ id, data });
          }}
        />
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="flex items-center">
            <button 
              className="px-2 py-1 border rounded-l-md text-gray-600 bg-white hover:bg-cream-50 disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                className={`px-3 py-1 border-t border-b ${
                  pageNum === currentPage
                    ? 'bg-burgundy-600 text-white'
                    : 'text-gray-700 hover:bg-cream-50'
                }`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            
            <button 
              className="px-2 py-1 border rounded-r-md text-gray-600 bg-white hover:bg-cream-50 disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      )}
      
      {/* Search Dialog */}
      <Dialog open={searchVisible} onOpenChange={setSearchVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Wines</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name, producer, region, or grape"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setSearchVisible(false);
                }}
              >
                Clear
              </Button>
              <Button 
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
  );
}
