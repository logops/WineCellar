import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Dashboard from "@/pages/Dashboard";
import Collection from "@/pages/Collection";
import Search from "@/pages/Search";
import Reports from "@/pages/Reports";
import WishList from "@/pages/WishList";
import { useState } from "react";
import MobileMenu from "@/components/layout/MobileMenu";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <Header 
            onMenuButtonClick={() => setIsMobileMenuOpen(true)} 
          />
          <MobileMenu 
            isOpen={isMobileMenuOpen} 
            onClose={() => setIsMobileMenuOpen(false)} 
          />
          <main className="flex-grow">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/collection" component={Collection} />
              <Route path="/search" component={Search} />
              <Route path="/reports" component={Reports} />
              <Route path="/wishlist" component={WishList} />
              <Route component={NotFound} />
            </Switch>
          </main>
          <Footer />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
