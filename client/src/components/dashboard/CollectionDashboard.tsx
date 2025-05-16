import { formatPrice, calculatePercentage } from "@/lib/utils";

interface DashboardProps {
  statistics: {
    inCellar: number;
    totalWines: number;
    consumed: number;
    purchased: number;
    redCount: number;
    whiteCount: number;
    sparklingCount: number;
    otherCount: number;
    totalValue: number;
    averageRating: number;
    readyToDrink: number;
  };
}

export default function CollectionDashboard({ statistics }: DashboardProps) {
  // Calculate percentages for the progress bars
  const totalBottles = statistics.inCellar;
  const redPercentage = Math.round((statistics.redCount / totalBottles) * 100) || 0;
  const whitePercentage = Math.round((statistics.whiteCount / totalBottles) * 100) || 0;
  const sparklingPercentage = Math.round((statistics.sparklingCount / totalBottles) * 100) || 0;
  const otherPercentage = Math.round((statistics.otherCount / totalBottles) * 100) || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-serif font-medium text-gray-800">Collection Dashboard</h2>
          <p className="text-gray-500 text-sm">Your cellar at a glance</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Bottles</p>
          <p className="text-3xl font-medium text-gray-800">{totalBottles}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Value</p>
          <p className="text-3xl font-medium text-gray-800">{formatPrice(statistics.totalValue)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Average Rating</p>
          <p className="text-3xl font-medium text-gray-800">{statistics.averageRating}<span className="text-base text-gray-500">/100</span></p>
        </div>
        <div>
          <p className="text-sm text-amber-500 mb-1">Ready to Drink</p>
          <p className="text-3xl font-medium text-gray-800">{statistics.readyToDrink}<span className="text-base text-gray-500"> bottles</span></p>
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-700 mb-4">Collection Composition</h3>
      
      <div className="space-y-5">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-700">Red Wine</span>
            <span className="text-sm text-gray-500">{statistics.redCount} bottles ({redPercentage}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-burgundy-600 rounded-full" 
              style={{ width: `${redPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-700">White Wine</span>
            <span className="text-sm text-gray-500">{statistics.whiteCount} bottles ({whitePercentage}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cream-500 rounded-full" 
              style={{ width: `${whitePercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-700">Sparkling Wine</span>
            <span className="text-sm text-gray-500">{statistics.sparklingCount} bottles ({sparklingPercentage}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gold-light rounded-full" 
              style={{ width: `${sparklingPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-700">Dessert Wine</span>
            <span className="text-sm text-gray-500">{statistics.otherCount} bottles ({otherPercentage}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-400 rounded-full" 
              style={{ width: `${otherPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}