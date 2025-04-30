import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Wine } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wine as WineIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WineRecommendationResult {
  recommendations: {
    wineId: number;
    wine: string;
    reasoning: string;
    characteristics: string;
    servingSuggestions: string;
    ageConsiderations: string;
    confidenceScore: number;
  }[];
  additionalSuggestions: string;
}

export default function WineRecommendations() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [recommendationResults, setRecommendationResults] = useState<WineRecommendationResult | null>(null);

  // Fetch wines from the user's cellar
  const { data: wines, isLoading: isLoadingWines } = useQuery<Wine[]>({ 
    queryKey: ['/api/wines', 'in_cellar'],
    queryFn: async () => {
      const response = await fetch(`/api/wines?consumedStatus=in_cellar`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch wines');
      }
      return response.json();
    }
  });

  // Mutation for getting wine recommendations
  const recommendMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/wine-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          wines: wines || []
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get wine recommendations');
      }
      
      const result = await response.json();
      return result.data as WineRecommendationResult;
    },
    onSuccess: (data) => {
      setRecommendationResults(data);
      setShowResults(true);
      toast({
        title: 'Recommendation Complete',
        description: 'AI has analyzed your cellar and found matches!',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Recommendation Failed',
        description: error instanceof Error ? error.message : 'Failed to get recommendations',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Query',
        description: 'Please enter a food pairing or occasion to get recommendations.',
      });
      return;
    }
    
    recommendMutation.mutate(query);
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Strong Match</Badge>;
    } else if (score >= 0.6) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Good Match</Badge>;
    } else {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Possible Match</Badge>;
    }
  };

  const getWineDetails = (wineId: number) => {
    if (!wines) return null;
    return wines.find(wine => wine.id === wineId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-montserrat font-semibold text-burgundy-700 mb-4">What Should I Drink?</h2>
      <p className="text-gray-600 mb-6">
        Tell us what you're eating or the occasion, and our AI sommelier will recommend wines from your cellar.
      </p>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label htmlFor="wine-query" className="block text-sm font-medium text-gray-700 mb-1">
            What are you planning to eat or what's the occasion?
          </label>
          <Textarea
            id="wine-query"
            placeholder="E.g., 'I'm having grilled salmon with lemon and herbs' or 'Celebrating our anniversary'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <Button 
          type="submit" 
          className="w-full"
          disabled={recommendMutation.isPending || isLoadingWines || !wines?.length}
        >
          {recommendMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finding Perfect Matches...
            </>
          ) : (
            "Get Recommendations"
          )}
        </Button>
        
        {isLoadingWines && (
          <p className="text-sm text-gray-500 mt-2">Loading your wine collection...</p>
        )}
        
        {wines?.length === 0 && (
          <p className="text-sm text-red-500 mt-2">
            You need wines in your cellar to get recommendations. Add some wines first!
          </p>
        )}
      </form>
      
      {showResults && recommendationResults && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Your Personalized Recommendations</h3>
          
          {recommendationResults.recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendationResults.recommendations.map((rec, index) => {
                const wine = getWineDetails(rec.wineId);
                return (
                  <Card key={index} className="border-burgundy-100">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle className="text-burgundy-700">{rec.wine}</CardTitle>
                          <CardDescription>
                            {wine?.region && `${wine.region}`}
                            {wine?.vintage && wine.region && ` • `}
                            {wine?.vintage === 0 ? "NV" : wine?.vintage}
                          </CardDescription>
                        </div>
                        <div>
                          {getConfidenceBadge(rec.confidenceScore)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <h4 className="text-sm font-medium mb-1 flex items-center">
                        <WineIcon className="h-4 w-4 mr-1 text-burgundy-600" />
                        Perfect Match Because:
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">{rec.reasoning}</p>
                      
                      <h4 className="text-sm font-medium mb-1">Flavor Profile:</h4>
                      <p className="text-sm text-gray-600 mb-3">{rec.characteristics}</p>
                      
                      <h4 className="text-sm font-medium mb-1">Serving Suggestions:</h4>
                      <p className="text-sm text-gray-600 mb-3">{rec.servingSuggestions}</p>
                      
                      <h4 className="text-sm font-medium mb-1">Age Considerations:</h4>
                      <p className="text-sm text-gray-600">{rec.ageConsiderations}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">No specific recommendations found for your query.</p>
              </CardContent>
            </Card>
          )}
          
          {recommendationResults.additionalSuggestions && (
            <div className="mt-6">
              <Separator className="my-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Additional Suggestions</h3>
              <p className="text-gray-600">{recommendationResults.additionalSuggestions}</p>
            </div>
          )}
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setQuery("");
                setShowResults(false);
                setRecommendationResults(null);
              }}
            >
              New Recommendation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}