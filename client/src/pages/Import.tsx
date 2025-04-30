import { PageHeader } from "@/components/ui/page-header";
import SpreadsheetImport from "@/components/spreadsheet/SpreadsheetImport";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";

export default function Import() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Redirect to auth page if not logged in
  if (!isLoading && !user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        heading="Import Your Collection"
        subheading="Upload a spreadsheet to import your wines"
      />
      
      <SpreadsheetImport />
    </div>
  );
}