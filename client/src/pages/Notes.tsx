import { useQuery } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import TabNavigation from "@/components/ui/TabNavigation";

export default function Notes() {
  const { data: wines, isLoading } = useQuery<Wine[]>({
    queryKey: ['/api/wines'],
  });

  // Filter wines with notes
  const winesWithNotes = wines?.filter(wine => wine.notes) || [];

  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "My Notes", href: "/notes" },
    { label: "Statistics", href: "/statistics" },
  ];

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="My Notes" />
      
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-burgundy-800">My Notes</h1>
          <Button asChild>
            <Link href="/add-wine">Add Wine</Link>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-burgundy-600"></div>
          </div>
        ) : winesWithNotes.length > 0 ? (
          <div className="grid gap-6">
            {winesWithNotes.map(wine => (
              <Card key={wine.id} className="overflow-hidden">
                <CardHeader className="bg-burgundy-50">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-burgundy-700">{wine.producer}</span>
                    {wine.vintage && <span className="font-spectral">{wine.vintage}</span>}
                    {wine.vineyard && <span className="text-burgundy-600">{wine.vineyard}</span>}
                    <span>{wine.name}</span>
                  </CardTitle>
                  <CardDescription>
                    {wine.grapeVarieties && <span className="mr-1">{wine.grapeVarieties}</span>}
                    {wine.region && <span>{wine.region}</span>}
                    {wine.subregion && <span className="text-gray-500 ml-1">({wine.subregion})</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="italic text-gray-700">{wine.notes}</div>
                </CardContent>
                <CardFooter className="border-t border-gray-100 bg-cream-50 text-xs text-gray-500">
                  <div className="flex justify-between w-full">
                    <span>Added on {formatDate(wine.createdAt)}</span>
                    <Link href={`/collection/${wine.id}`}>
                      <Button variant="link" size="sm" className="h-5 p-0">View Details</Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-cream-200 rounded-lg bg-cream-50">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-medium text-burgundy-700 mb-2">No Notes Yet</h3>
            <p className="text-gray-600 mb-6">
              Start adding tasting notes to your wines to keep track of your impressions.
            </p>
            <Button asChild>
              <Link href="/collection">Go to My Collection</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}