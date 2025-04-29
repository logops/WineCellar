import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <div 
      className={cn(
        "fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity", 
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className={cn(
        "bg-white h-full w-64 shadow-lg transition-transform duration-300 transform",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b flex justify-between items-center">
          <span className="font-bold font-montserrat">Menu</span>
          <button onClick={onClose} aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-4">
          <ul className="space-y-3">
            <li>
              <Link 
                href="/" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                href="/collection" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                My Collection
              </Link>
            </li>
            <li>
              <Link 
                href="/collection" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Add Wine
              </Link>
            </li>
            <li>
              <Link 
                href="/collection" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Drink or Remove
              </Link>
            </li>
            <li>
              <Link 
                href="/wishlist" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                My Wish List
              </Link>
            </li>
            <li>
              <Link 
                href="/reports" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Ready to Drink
              </Link>
            </li>
            <li>
              <Link 
                href="/recommendations" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Wine Recommendations
              </Link>
            </li>
            <li>
              <Link 
                href="/notes" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                My Notes
              </Link>
            </li>
            <li>
              <Link 
                href="/reports" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Reports
              </Link>
            </li>
            <li>
              <Link 
                href="/reports?tab=statistics" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Statistics
              </Link>
            </li>
            <li>
              <Link 
                href="/" 
                className="block py-2 px-4 hover:bg-cream-100 rounded-md"
                onClick={onClose}
              >
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
