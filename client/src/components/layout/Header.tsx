import { Link } from "wouter";

interface HeaderProps {
  onMenuButtonClick: () => void;
}

export default function Header({ onMenuButtonClick }: HeaderProps) {
  return (
    <header className="bg-burgundy-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            className="md:hidden mr-2" 
            onClick={onMenuButtonClick}
            aria-label="Open mobile menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold font-montserrat tracking-tight">Cellar</span>
            <span className="ml-1 py-0.5 px-2 bg-cream-500 text-burgundy-600 text-xs font-bold rounded-sm">TRACKER</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/" className="text-cream-100 hover:text-white">Dashboard</Link>
          <Link href="/collection" className="text-cream-100 hover:text-white">My Collection</Link>
          <Link href="/notes" className="text-cream-100 hover:text-white">My Notes</Link>
          <Link href="/reports" className="text-cream-100 hover:text-white">Reports</Link>
          <div className="relative">
            <button className="flex items-center focus:outline-none">
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-burgundy-400 flex items-center justify-center text-white">
                JD
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Subscription Banner */}
      <div className="bg-burgundy-500 text-white py-2 px-4 text-center text-sm">
        <span className="font-montserrat">Become a Cellar Subscriber to unlock all features &gt;</span>
      </div>
    </header>
  );
}
