import PageHeader from "@/components/ui/page-header";
import SpreadsheetImport from "@/components/spreadsheet/SpreadsheetImport";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export default function Import() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Import Wine Collection" 
        description="Upload your spreadsheet to import your wine collection"
      />
      <SpreadsheetImport />
    </div>
  );
}