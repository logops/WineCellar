import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMenuButtonClick: () => void;
}

export default function Header({ onMenuButtonClick }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
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
          <Link href={user ? "/" : "/auth"} className="flex items-center">
            <span className="text-xl font-bold font-montserrat tracking-tight">Cellar</span>
            <span className="ml-1 py-0.5 px-2 bg-cream-500 text-burgundy-600 text-xs font-bold rounded-sm">MASTER</span>
          </Link>
        </div>
        
        {user ? (
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-cream-100 hover:text-white">Dashboard</Link>
            <Link href="/collection" className="text-cream-100 hover:text-white">My Collection</Link>
            <Link href="/notes" className="text-cream-100 hover:text-white">My Notes</Link>
            <Link href="/reports" className="text-cream-100 hover:text-white">Reports</Link>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center focus:outline-none">
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-burgundy-400 flex items-center justify-center text-white">
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <User className="mr-2 h-4 w-4" />
                    <span>{user.username}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth" className="bg-cream-500 text-burgundy-600 hover:bg-cream-600 font-medium py-2 px-4 rounded">
              Login
            </Link>
          </div>
        )}
      </div>
      
    </header>
  );
}
