import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface CollectionStat {
  label: string;
  count: number;
  href: string;
}

export default function CollectionStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/statistics'],
  });

  const collectionStats: CollectionStat[] = stats ? [
    { label: 'In My Cellar', count: stats.inCellar, href: '/collection' },
    { label: 'Pending Delivery', count: 0, href: '/collection' },
    { label: 'Consumed', count: stats.consumed, href: '/collection' },
    { label: 'Purchased', count: stats.purchased, href: '/collection' },
  ] : [];
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
      <h2 className="text-xl font-montserrat font-semibold mb-4 text-burgundy-700">My Collection</h2>
      
      <div className="space-y-3">
        {collectionStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="flex items-center justify-between p-3 border rounded-md hover:bg-cream-50 transition-colors">
            <span className="text-burgundy-600 font-medium">{stat.label}</span>
            <div className="flex items-center">
              <span className="text-lg font-semibold mr-2">{stat.count}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
