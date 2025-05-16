import { useState, useEffect } from "react";
import TabNavigation from "@/components/ui/TabNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReadyToDrinkList from "@/components/reports/ReadyToDrinkList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("ready-to-drink");
  const [location] = useLocation();
  
  // Extract the tab from the URL query parameter if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['ready-to-drink', 'wine-list'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);
  
  const tabs = [
    { label: "Ready to Drink", href: "/reports" },
    { label: "Wine List", href: "/reports?tab=wine-list" },
  ];

  const { data: wines, isLoading } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines'],
  });

  if (isLoading) {
    return (
      <>
        <TabNavigation tabs={tabs} activeTab="Reports" />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="Reports" />
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-montserrat font-semibold text-burgundy-700 mb-6">Wine Reports</h1>
        
        <Tabs defaultValue="ready-to-drink" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="ready-to-drink">Ready to Drink</TabsTrigger>
            <TabsTrigger value="wine-list">Wine List</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ready-to-drink">
            <Card>
              <CardHeader>
                <CardTitle>Ready to Drink Wines</CardTitle>
              </CardHeader>
              <CardContent>
                <ReadyToDrinkList wines={wines || []} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="wine-list">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Style Wine List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 space-y-6">
                  {/* Red Wines */}
                  <div>
                    <h3 className="text-lg font-medium text-burgundy-700 border-b pb-2 mb-3">Red Wines</h3>
                    <div className="space-y-3">
                      {wines?.filter(wine => wine.type === 'red').map(wine => (
                        <div key={wine.id} className="flex justify-between">
                          <div>
                            <p className="font-medium">{wine.producer} {wine.name}</p>
                            <p className="text-sm text-gray-600">{wine.vintage}, {wine.region}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${wine.currentValue?.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{wine.bottleSize}</p>
                          </div>
                        </div>
                      ))}
                      {wines?.filter(wine => wine.type === 'red').length === 0 && (
                        <p className="text-gray-500 italic">No red wines in your collection</p>
                      )}
                    </div>
                  </div>

                  {/* White Wines */}
                  <div>
                    <h3 className="text-lg font-medium text-burgundy-700 border-b pb-2 mb-3">White Wines</h3>
                    <div className="space-y-3">
                      {wines?.filter(wine => wine.type === 'white').map(wine => (
                        <div key={wine.id} className="flex justify-between">
                          <div>
                            <p className="font-medium">{wine.producer} {wine.name}</p>
                            <p className="text-sm text-gray-600">{wine.vintage}, {wine.region}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${wine.currentValue?.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{wine.bottleSize}</p>
                          </div>
                        </div>
                      ))}
                      {wines?.filter(wine => wine.type === 'white').length === 0 && (
                        <p className="text-gray-500 italic">No white wines in your collection</p>
                      )}
                    </div>
                  </div>

                  {/* Sparkling Wines */}
                  <div>
                    <h3 className="text-lg font-medium text-burgundy-700 border-b pb-2 mb-3">Sparkling Wines</h3>
                    <div className="space-y-3">
                      {wines?.filter(wine => wine.type === 'sparkling').map(wine => (
                        <div key={wine.id} className="flex justify-between">
                          <div>
                            <p className="font-medium">{wine.producer} {wine.name}</p>
                            <p className="text-sm text-gray-600">{wine.vintage}, {wine.region}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${wine.currentValue?.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{wine.bottleSize}</p>
                          </div>
                        </div>
                      ))}
                      {wines?.filter(wine => wine.type === 'sparkling').length === 0 && (
                        <p className="text-gray-500 italic">No sparkling wines in your collection</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          

        </Tabs>
      </div>
    </>
  );
}
