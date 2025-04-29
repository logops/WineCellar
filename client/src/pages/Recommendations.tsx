import TabNavigation from "@/components/ui/TabNavigation";
import WineRecommendations from "@/components/wines/WineRecommendations";

export default function Recommendations() {
  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "Recommendations", href: "/recommendations" },
    { label: "Statistics", href: "/statistics" },
  ];

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="Recommendations" />
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-montserrat font-semibold text-burgundy-700 mb-6">
          Wine Recommendations
        </h1>
        
        <WineRecommendations />
        
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
      </div>
    </>
  );
}