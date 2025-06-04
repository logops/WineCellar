import CollectionStats from "@/components/dashboard/CollectionStats";
import QuickActions from "@/components/dashboard/QuickActions";
import ReportsSection from "@/components/dashboard/ReportsSection";
import TabNavigation from "@/components/ui/TabNavigation";
import WineList from "@/components/wines/WineList";

export default function Dashboard() {
  const tabs = [
    { label: "Current Collection", href: "/" },
    { label: "Recent Activity", href: "/collection#consumed" },
  ];

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="My Cellar" />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Stats & Actions */}
          <div className="w-full lg:w-1/4">
            <CollectionStats />
            
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <h2 className="text-xl font-serif font-medium mb-4 text-burgundy-700">Quick Actions</h2>
              <QuickActions />
            </div>
            
            <ReportsSection />
          </div>

          {/* Right Column - Wine List */}
          <div className="w-full lg:w-3/4">
            <WineList />
          </div>
        </div>
      </div>
    </>
  );
}
