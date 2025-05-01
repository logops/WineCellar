import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Search, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Recommendation {
  wineId: number;
  wine: string;
  reasoning: string;
  characteristics: string;
  servingSuggestions: string;
  ageConsiderations: string;
  confidenceScore: number;
}

interface RecommendationHistoryItem {
  id: number;
  userId: number;
  query: string;
  recommendations: Recommendation[];
  additionalSuggestions: string | null;
  createdAt: string;
}

export default function RecommendationHistory() {
  const { toast } = useToast();
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationHistoryItem | null>(null);

  // Fetch recommendation history
  const { data: history, isLoading, isError, error } = useQuery<RecommendationHistoryItem[]>({ 
    queryKey: ['/api/recommendation-history'],
    queryFn: async () => {
      const response = await fetch('/api/recommendation-history', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recommendation history');
      }
      const result = await response.json();
      return result.data;
    }
  });

  const handleViewDetails = (item: RecommendationHistoryItem) => {
    setSelectedRecommendation(item);
  };

  const handleBack = () => {
    setSelectedRecommendation(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-burgundy-600" />
        <span className="ml-2 text-burgundy-600">Loading recommendation history...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Error loading recommendation history</p>
        <p className="text-gray-600">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center bg-cream-100 rounded-lg border border-cream-200">
        <div className="mb-4 flex justify-center">
          <Search className="h-12 w-12 text-burgundy-400" />
        </div>
        <h3 className="text-lg font-medium text-burgundy-700 mb-2">No Recommendations Yet</h3>
        <p className="text-gray-600 mb-4">
          You haven't used the wine recommendation feature yet. Try asking for a recommendation based on a food pairing or occasion.
        </p>
        <Button variant="default" onClick={() => window.location.href = '/recommendations'}>
          Get Wine Recommendations
        </Button>
      </div>
    );
  }

  // Display details of a selected recommendation
  if (selectedRecommendation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBack} className="mr-2">
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            Back
          </Button>
          <h2 className="text-xl font-semibold text-burgundy-700">
            Recommendation Details
          </h2>
        </div>

        <Card className="border-cream-200 bg-white">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-burgundy-700">"{selectedRecommendation.query}"</CardTitle>
                <CardDescription>
                  {new Date(selectedRecommendation.createdAt).toLocaleDateString()} • 
                  {formatDistanceToNow(new Date(selectedRecommendation.createdAt), { addSuffix: true })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedRecommendation.recommendations.map((rec, index) => (
              <Card key={index} className="border-cream-200 bg-cream-50">
                <CardHeader>
                  <CardTitle className="text-lg">{rec.wine}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-burgundy-700">Why This Wine</h4>
                    <p className="text-gray-700">{rec.reasoning}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-burgundy-700">Characteristics</h4>
                    <p className="text-gray-700">{rec.characteristics}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-burgundy-700">Serving Suggestions</h4>
                    <p className="text-gray-700">{rec.servingSuggestions}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-burgundy-700">Age Considerations</h4>
                    <p className="text-gray-700">{rec.ageConsiderations}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {selectedRecommendation.additionalSuggestions && (
              <div className="mt-4 p-4 bg-cream-50 rounded-lg">
                <h4 className="font-medium text-burgundy-700 mb-2">Additional Suggestions</h4>
                <p className="text-gray-700">{selectedRecommendation.additionalSuggestions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display the list of recommendation history
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {history.map((item) => (
          <Card key={item.id} className="border-cream-200 hover:border-burgundy-300 transition-colors cursor-pointer" 
                onClick={() => handleViewDetails(item)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-burgundy-700">"{item.query}"</CardTitle>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-2">
                {item.recommendations.length} wines recommended
              </p>
              <div className="flex flex-wrap gap-2">
                {item.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="text-xs bg-cream-100 text-burgundy-700 px-2 py-1 rounded-full">
                    {rec.wine}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-0 text-burgundy-600 text-sm">
              View details <ChevronRight className="h-4 w-4 ml-1" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
