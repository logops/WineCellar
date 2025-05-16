import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConsumeWineForm from "./ConsumeWineForm";
import LabelRemover from "../wines/LabelRemover";

interface EnhancedDrinkOrRemoveFormProps {
  onSuccess?: () => void;
}

export default function EnhancedDrinkOrRemoveForm({ onSuccess }: EnhancedDrinkOrRemoveFormProps) {
  const [activeTab, setActiveTab] = useState<string>("single");
  
  const handleSuccess = () => {
    if (onSuccess) onSuccess();
  };

  return (
    <div className="p-1">
      <Tabs 
        defaultValue="single" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="single">Select Single Wine</TabsTrigger>
          <TabsTrigger value="by-label">Remove by Label</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="mt-4">
          <ConsumeWineForm onSuccess={handleSuccess} />
        </TabsContent>
        
        <TabsContent value="by-label" className="mt-4">
          <div className="px-1">
            <p className="text-gray-600 mb-6">
              Take a photo of wine labels to quickly find and remove wines from your collection. 
              Our system will match the labels against wines in your cellar.
            </p>
            <LabelRemover onComplete={handleSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}