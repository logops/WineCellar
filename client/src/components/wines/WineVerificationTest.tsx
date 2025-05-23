import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WineMatch {
  fullName: string;
  producer: string;
  vintage: number;
  name: string;
  region: string;
  subregion?: string;
  country: string;
  grapeVarieties: string;
  type: string;
  confidence: number;
  source: string;
}

interface WineVerificationResult {
  originalInput: string;
  matches: WineMatch[];
  isExactMatch: boolean;
  needsUserSelection: boolean;
}

export default function WineVerificationTest() {
  const [wineInput, setWineInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<WineVerificationResult | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<WineMatch | null>(null);

  const handleVerifyWine = async () => {
    if (!wineInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter wine information to verify",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setSelectedMatch(null);

    try {
      const response = await fetch('/api/wines/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wineInput: wineInput.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify wine information');
      }

      const result: WineVerificationResult = await response.json();
      setVerificationResult(result);

      if (result.isExactMatch && result.matches.length === 1) {
        setSelectedMatch(result.matches[0]);
        toast({
          title: "Exact Match Found!",
          description: "We found a perfect match for your wine",
          variant: "default",
        });
      } else if (result.matches.length > 0) {
        toast({
          title: "Multiple Matches Found",
          description: `Found ${result.matches.length} possible matches. Please select the correct one.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No Matches Found",
          description: "We couldn't find any matching wines. Your input will be used as-is.",
          variant: "default",
        });
      }

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify wine",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectMatch = (match: WineMatch) => {
    setSelectedMatch(match);
    toast({
      title: "Wine Selected",
      description: `Selected: ${match.fullName}`,
      variant: "default",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-serif mb-6">Wine Verification Test</h1>
      <p className="text-gray-600 mb-6">
        Test our AI-powered wine verification system. Enter partial wine information and see detailed matches.
      </p>

      <div className="mb-8">
        <div className="flex gap-4">
          <Input
            placeholder="Enter wine info (e.g., '2018 Mondavi Chardonnay', 'Opus One 2019')"
            value={wineInput}
            onChange={(e) => setWineInput(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && !isVerifying && handleVerifyWine()}
          />
          <Button 
            onClick={handleVerifyWine} 
            disabled={isVerifying || !wineInput.trim()}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Wine'
            )}
          </Button>
        </div>
      </div>

      {verificationResult && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <strong>Original Input:</strong> {verificationResult.originalInput}
            {verificationResult.isExactMatch ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
          </div>

          {verificationResult.matches.length > 0 ? (
            <div>
              <h2 className="text-xl font-serif mb-4">
                Found {verificationResult.matches.length} Match{verificationResult.matches.length !== 1 ? 'es' : ''}
              </h2>
              <div className="grid gap-4">
                {verificationResult.matches.map((match, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedMatch === match 
                        ? 'ring-2 ring-burgundy-600 bg-burgundy-50' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleSelectMatch(match)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{match.fullName}</CardTitle>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadgeColor(match.confidence)}`}>
                          {match.confidence}% confidence
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div><strong>Producer:</strong> {match.producer}</div>
                          <div><strong>Vintage:</strong> {match.vintage}</div>
                          <div><strong>Name:</strong> {match.name}</div>
                          <div><strong>Type:</strong> {match.type}</div>
                        </div>
                        <div className="space-y-2">
                          <div><strong>Region:</strong> {match.region}</div>
                          {match.subregion && <div><strong>Sub-region:</strong> {match.subregion}</div>}
                          <div><strong>Country:</strong> {match.country}</div>
                          <div><strong>Grapes:</strong> {match.grapeVarieties}</div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <strong>Why this match:</strong> {match.source}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Matches Found</h3>
                <p className="text-gray-600">
                  The AI couldn't find any specific wines matching your input. 
                  Your original input would be used as-is.
                </p>
              </CardContent>
            </Card>
          )}

          {selectedMatch && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Selected Wine</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700">
                  <strong>{selectedMatch.fullName}</strong> has been selected. 
                  This verified information would be used for your wine collection.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}