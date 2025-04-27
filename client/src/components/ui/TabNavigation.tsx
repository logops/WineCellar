import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface TabItem {
  label: string;
  href: string;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
}

export default function TabNavigation({ tabs, activeTab }: TabNavigationProps) {
  return (
    <div className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <Link 
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-6 py-4 font-medium border-b-2 whitespace-nowrap transition-colors",
                tab.label === activeTab
                  ? "text-burgundy-600 border-burgundy-600"
                  : "text-gray-500 border-transparent hover:text-burgundy-500"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
