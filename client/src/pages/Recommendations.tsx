import TabNavigation from "@/components/ui/TabNavigation";
import WineRecommendations from "@/components/wines/WineRecommendations";
import RecommendationHistory from "@/components/wines/RecommendationHistory";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Recommendations() {
  const mainTabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "Recommendations", href: "/recommendations" },
    { label: "Statistics", href: "/statistics" },
  ];

  const [activeTab, setActiveTab] = useState("new");

  return (
    <>
      <TabNavigation tabs={mainTabs} activeTab="Recommendations" />
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-montserrat font-semibold text-burgundy-700 mb-6">
          Wine Recommendations
        </h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-cream-100">
            <TabsTrigger value="new" className="data-[state=active]:bg-white data-[state=active]:text-burgundy-700">
              Get Recommendations
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-burgundy-700">
              Recommendation History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new" className="mt-4">
            <WineRecommendations />
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <RecommendationHistory />
          </TabsContent>
        </Tabs>
        
        {activeTab === "new" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-montserrat font-semibold text-burgundy-700 mb-4">
              About AI Wine Recommendations
            </h2>
            <div className="prose max-w-none">
              <p>
                Our AI sommelier analyzes the wines in your cellar to provide personalized recommendations based on your specific needs:
              </p>
              <ul>
                <li><strong>Food Pairings</strong> - Tell us what you're planning to eat, and we'll suggest wines that complement your meal perfectly.</li>
                <li><strong>Special Occasions</strong> - Looking for the perfect wine for an anniversary, promotion, or holiday celebration? We've got you covered.</li>
                <li><strong>Mood & Setting</strong> - Whether it's a cozy night in or a dinner party with friends, get recommendations that match the atmosphere.</li>
              </ul>
              <p>
                Our recommendations are based on traditional wine pairing principles, the specific characteristics of the wines in your collection, 
                and your personal preferences over time.
              </p>
            </div>
          </div>
        )}
        
        {activeTab === "history" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-montserrat font-semibold text-burgundy-700 mb-4">
              About Recommendation History
            </h2>
            <div className="prose max-w-none">
              <p>
                Your recommendation history shows all the wine recommendations you've received from our AI sommelier. 
                You can view the details of any past recommendation to see which wines were suggested and why.
              </p>
              <p>
                This history makes it easy to find wines that worked well for similar occasions in the past, 
                helping you build knowledge about your collection and make informed decisions for future events.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}