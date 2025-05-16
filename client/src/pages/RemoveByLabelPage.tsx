import RemoveByLabel from "../components/wines/RemoveByLabel";
import { useLocation } from "wouter";

export default function RemoveByLabelPage() {
  const [_, navigate] = useLocation();

  const handleComplete = () => {
    // Navigate back to collection after successful removal
    navigate("/collection");
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-serif font-medium text-burgundy-700 mb-6">
        Remove Wines by Label
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-600 mb-6">
          Take a photo of wine labels to quickly find and remove wines from your collection. 
          Our system will match the labels against wines in your cellar.
        </p>
        
        <RemoveByLabel onComplete={handleComplete} />
      </div>
    </main>
  );
}