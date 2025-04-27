import { Wine } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WineStatisticsProps {
  wines: Wine[];
  stats: any;
}

export default function WineStatistics({ wines, stats }: WineStatisticsProps) {
  // Calculate collection value
  const totalValue = wines.reduce((sum, wine) => sum + (wine.currentValue || 0) * wine.quantity, 0);
  
  // Count wine types
  const wineTypeCount = wines.reduce((counts: Record<string, number>, wine) => {
    const type = wine.type || 'unknown';
    if (!counts[type]) counts[type] = 0;
    counts[type] += wine.quantity;
    return counts;
  }, {});
  
  // Format data for pie chart
  const pieChartData = Object.keys(wineTypeCount).map(type => ({
    name: getWineTypeName(type),
    value: wineTypeCount[type]
  }));
  
  // Get unique regions
  const regionCounts: Record<string, number> = {};
  wines.forEach(wine => {
    if (wine.region) {
      regionCounts[wine.region] = (regionCounts[wine.region] || 0) + wine.quantity;
    }
  });
  
  // Format data for region bar chart
  const regionChartData = Object.keys(regionCounts)
    .map(region => ({
      name: region,
      bottles: regionCounts[region]
    }))
    .sort((a, b) => b.bottles - a.bottles)
    .slice(0, 10); // Top 10 regions
  
  // Pie chart colors
  const COLORS = ['#8C2132', '#E5D6A0', '#E68A8A', '#F1E6C2', '#43101F', '#F9EADB'];
  
  // Helper function to get readable wine type names
  function getWineTypeName(type: string): string {
    switch (type) {
      case 'red': return 'Red Wine';
      case 'white': return 'White Wine';
      case 'rose': return 'Rosé';
      case 'sparkling': return 'Sparkling Wine';
      case 'dessert': return 'Dessert Wine';
      case 'fortified': return 'Fortified Wine';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cream-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 mb-2">Total Bottles</p>
          <p className="text-3xl font-semibold text-burgundy-700">{stats?.inCellar || 0}</p>
        </div>
        
        <div className="bg-cream-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 mb-2">Collection Value</p>
          <p className="text-3xl font-semibold text-burgundy-700">{formatPrice(totalValue)}</p>
        </div>
        
        <div className="bg-cream-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 mb-2">Ready to Drink</p>
          <p className="text-3xl font-semibold text-burgundy-700">{stats?.readyToDrink || 0}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Wine Types Chart */}
        <div>
          <h3 className="text-lg font-medium text-burgundy-700 mb-4">Wine Types Distribution</h3>
          <div className="h-64">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} bottles`, 'Quantity']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic">No data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Regions Chart */}
        <div>
          <h3 className="text-lg font-medium text-burgundy-700 mb-4">Top Wine Regions</h3>
          <div className="h-64">
            {regionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={regionChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} bottles`, 'Quantity']} />
                  <Bar dataKey="bottles" fill="#8C2132" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 italic">No region data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-burgundy-700 mb-4">Collection Summary</h3>
        <div className="bg-white border rounded-md p-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600">Total Unique Wines</dt>
              <dd className="text-lg">{wines.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Consumed Bottles</dt>
              <dd className="text-lg">{stats?.consumed || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Average Bottle Value</dt>
              <dd className="text-lg">
                {formatPrice(totalValue / (stats?.inCellar || 1))}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Ready to Drink Percentage</dt>
              <dd className="text-lg">
                {stats?.inCellar ? Math.round((stats.readyToDrink / stats.inCellar) * 100) : 0}%
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
