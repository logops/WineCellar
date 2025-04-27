import CollectionStats from "@/components/dashboard/CollectionStats";
import QuickActions from "@/components/dashboard/QuickActions";
import ReportsSection from "@/components/dashboard/ReportsSection";
import TabNavigation from "@/components/ui/TabNavigation";
import WineList from "@/components/wines/WineList";

export default function Dashboard() {
  const tabs = [
    { label: "My Cellar", href: "/" },
    { label: "Search", href: "/search" },
    { label: "My Notes", href: "/notes" },
    { label: "Statistics", href: "/statistics" },
  ];

  return (
    <>
      <TabNavigation tabs={tabs} activeTab="My Cellar" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column - Stats & Actions */}
          <div className="w-full md:w-1/3">
            <CollectionStats />
            
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <h2 className="text-xl font-montserrat font-semibold mb-4 text-burgundy-700">Quick Actions</h2>
              <QuickActions />
            </div>
            
            <ReportsSection />
          </div>

          {/* Right Column - Wine List */}
          <div className="w-full md:w-2/3">
            <WineList />
          </div>
        </div>
      </div>
    </>
  );
}
