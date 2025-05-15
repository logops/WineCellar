import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Grape, MapPin, CalendarClock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';

interface WineInfoData {
  grapeVarieties: string;
  vineyard?: string;
  region?: string;
  subregion?: string;
  tastingNotes?: string;
  foodPairings?: string;
  drinkingWindow?: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  productionNotes?: string;
  reasoning?: string;
}

interface WineInfoResponse {
  success: boolean;
  data?: WineInfoData;
  message?: string;
}

export function WineLookupInfo() {
  const { toast } = useToast();
  const [wineName, setWineName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');
  
  const lookupMutation = useMutation<WineInfoResponse, Error, { wineName: string; producer?: string; vintage?: string }>({
    mutationFn: async (data: { wineName: string; producer?: string; vintage?: string }) => {
      const response = await apiRequest('POST', '/api/wine-info-lookup', data);
      return await response.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error looking up wine information',
        description: error.message,
        variant: 'destructive',
      });
    }
  }
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wineName.trim()) {
      toast({
        title: 'Wine name required',
        description: 'Please enter at least the wine name',
        variant: 'destructive',
      });
      return;
    }
    
    lookupMutation.mutate({
      wineName: wineName.trim(),
      producer: producer.trim() || undefined,
      vintage: vintage.trim() || undefined,
    });
  };
  
  const determineConfidenceColor = (level?: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-red-600';
      default: return '';
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-burgundy-700">Wine Information Lookup</CardTitle>
          <CardDescription className="font-elegant">
            Enter a wine name to find detailed information about it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="wineName" className="font-elegant">Wine Name</Label>
              <Input
                id="wineName"
                value={wineName}
                onChange={(e) => setWineName(e.target.value)}
                placeholder="e.g. Château Margaux"
                className="font-elegant"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="producer" className="font-elegant">Producer (optional)</Label>
              <Input
                id="producer"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder="e.g. Château Margaux"
                className="font-elegant"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vintage" className="font-elegant">Vintage (optional)</Label>
              <Input
                id="vintage"
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
                placeholder="e.g. 2015"
                className="font-elegant"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full font-serif"
              disabled={lookupMutation.isPending}
            >
              {lookupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up...
                </>
              ) : 'Look Up Wine Information'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {lookupMutation.data?.success && lookupMutation.data?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-burgundy-700">Wine Information</CardTitle>
            <CardDescription>
              <span className={`${determineConfidenceColor(lookupMutation.data.data.confidenceLevel)} font-elegant`}>
                {lookupMutation.data.data.confidenceLevel.charAt(0).toUpperCase() + lookupMutation.data.data.confidenceLevel.slice(1)} confidence
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Grape className="h-5 w-5 text-burgundy" />
                <h3 className="font-semibold font-serif text-burgundy-700">Grape Varieties</h3>
              </div>
              <p className="mt-1 text-sm font-elegant">{lookupMutation.data.data.grapeVarieties}</p>
            </div>
            
            {(lookupMutation.data.data.region || lookupMutation.data.data.subregion || lookupMutation.data.data.vineyard) && (
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-burgundy" />
                  <h3 className="font-semibold font-serif text-burgundy-700">Origin</h3>
                </div>
                <div className="mt-1 text-sm font-elegant space-y-1">
                  {lookupMutation.data.data.vineyard && (
                    <p><span className="font-medium">Vineyard:</span> {lookupMutation.data.data.vineyard}</p>
                  )}
                  {lookupMutation.data.data.region && (
                    <p><span className="font-medium">Region:</span> {lookupMutation.data.data.region}</p>
                  )}
                  {lookupMutation.data.data.subregion && (
                    <p><span className="font-medium">Subregion:</span> {lookupMutation.data.data.subregion}</p>
                  )}
                </div>
              </div>
            )}
            
            {lookupMutation.data.data.drinkingWindow && (
              <div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-burgundy" />
                  <h3 className="font-semibold font-serif text-burgundy-700">Drinking Window</h3>
                </div>
                <p className="mt-1 text-sm font-elegant">{lookupMutation.data.data.drinkingWindow}</p>
              </div>
            )}
            
            {lookupMutation.data.data.tastingNotes && (
              <div>
                <h3 className="font-semibold font-serif text-burgundy-700 mb-1">Tasting Notes</h3>
                <p className="text-sm font-elegant">{lookupMutation.data.data.tastingNotes}</p>
              </div>
            )}
            
            {lookupMutation.data.data.foodPairings && (
              <div>
                <h3 className="font-semibold font-serif text-burgundy-700 mb-1">Food Pairings</h3>
                <p className="text-sm font-elegant">{lookupMutation.data.data.foodPairings}</p>
              </div>
            )}
            
            {lookupMutation.data.data.productionNotes && (
              <div>
                <h3 className="font-semibold font-serif text-burgundy-700 mb-1">Production Notes</h3>
                <p className="text-sm font-elegant">{lookupMutation.data.data.productionNotes}</p>
              </div>
            )}
            
            <Separator />
            
            <div className="text-sm text-muted-foreground italic">
              <p>Data sourced from wine databases and sommelier knowledge.</p>
              {lookupMutation.data.data.reasoning && (
                <p className="mt-1">{lookupMutation.data.data.reasoning}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {lookupMutation.data?.success === false && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Information Lookup Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{lookupMutation.data?.message || 'Unable to find information for this wine'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
