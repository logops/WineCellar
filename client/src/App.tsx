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
import Notes from "@/pages/Notes";
import Recommendations from "@/pages/Recommendations";
import Import from "@/pages/Import";
import RemoveByLabelPage from "@/pages/RemoveByLabelPage";
import SimpleRemoveByLabel from "@/pages/SimpleRemoveByLabel";
import WineVerificationTestPage from "@/pages/WineVerificationTestPage";
import AuthPage from "@/pages/auth-page";
import { useState } from "react";
import MobileMenu from "@/components/layout/MobileMenu";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { CellarsProvider } from "@/hooks/use-cellars";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CellarsProvider>
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
                  <ProtectedRoute path="/" component={Dashboard} />
                  <ProtectedRoute path="/collection" component={Collection} />
                  <ProtectedRoute path="/search" component={Search} />
                  <ProtectedRoute path="/reports" component={Reports} />
                  <ProtectedRoute path="/wishlist" component={WishList} />
                  <ProtectedRoute path="/notes" component={Notes} />
                  <ProtectedRoute path="/recommendations" component={Recommendations} />
                  <ProtectedRoute path="/import" component={Import} />
                  <ProtectedRoute path="/remove-by-label" component={RemoveByLabelPage} />
                  <ProtectedRoute path="/wine-verification-test" component={WineVerificationTestPage} />
                  <Route path="/auth" component={AuthPage} />
                  <Route component={NotFound} />
                </Switch>
              </main>
              <Footer />
              <Toaster />
            </div>
          </TooltipProvider>
        </CellarsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
