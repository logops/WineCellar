import { anthropic } from './anthropic';
import { Request, Response } from 'express';

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

/**
 * Verify wine information using AI knowledge
 */
export async function verifyWineInformation(wineInput: string): Promise<WineVerificationResult> {
  try {
    const prompt = `You are a wine expert with comprehensive knowledge of wines worldwide. A user has entered: "${wineInput}"

Please search your knowledge to find specific, real wines that match this input. Return detailed information about actual wines that exist.

Rules:
1. Only suggest REAL wines that actually exist
2. If the input is vague (like "2018 Mondavi Chardonnay"), find the specific wines that producer made in that vintage
3. Include full wine names, appellations, and details
4. Rank by likelihood of what the user meant
5. Include confidence scores (0-100)

Return your response as JSON in this exact format:
{
  "matches": [
    {
      "fullName": "Complete wine name with appellation",
      "producer": "Producer name",
      "vintage": 2018,
      "name": "Specific wine name",
      "region": "Primary region",
      "subregion": "Sub-region if applicable", 
      "country": "Country",
      "grapeVarieties": "Grape varieties",
      "type": "Red/White/Rosé/Sparkling",
      "confidence": 95,
      "source": "Why this match makes sense"
    }
  ],
  "isExactMatch": false,
  "needsUserSelection": true
}

If you find an exact match with 100% confidence, set isExactMatch to true and needsUserSelection to false.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse the JSON response - handle markdown formatting
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const verificationData = JSON.parse(cleanedResponse);
    
    return {
      originalInput: wineInput,
      matches: verificationData.matches || [],
      isExactMatch: verificationData.isExactMatch || false,
      needsUserSelection: verificationData.needsUserSelection !== false
    };

  } catch (error) {
    console.error('Wine verification error:', error);
    // Return the original input as a fallback
    return {
      originalInput: wineInput,
      matches: [],
      isExactMatch: false,
      needsUserSelection: false
    };
  }
}

/**
 * Handle wine verification requests
 */
export async function handleWineVerification(req: Request, res: Response) {
  try {
    const { wineInput } = req.body;

    if (!wineInput || typeof wineInput !== 'string') {
      return res.status(400).json({ 
        error: 'Wine input is required and must be a string' 
      });
    }

    const verificationResult = await verifyWineInformation(wineInput);
    
    res.json(verificationResult);

  } catch (error) {
    console.error('Wine verification API error:', error);
    res.status(500).json({ 
      error: 'Failed to verify wine information' 
    });
  }
}

/**
 * Verify multiple wines at once (useful for batch imports)
 */
export async function verifyMultipleWines(wineInputs: string[]): Promise<WineVerificationResult[]> {
  const results: WineVerificationResult[] = [];
  
  // Process wines one by one to avoid overwhelming the API
  for (const wineInput of wineInputs) {
    try {
      const result = await verifyWineInformation(wineInput);
      results.push(result);
      
      // Add small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to verify wine: ${wineInput}`, error);
      results.push({
        originalInput: wineInput,
        matches: [],
        isExactMatch: false,
        needsUserSelection: false
      });
    }
  }
  
  return results;
}

/**
 * Handle batch wine verification requests
 */
export async function handleBatchWineVerification(req: Request, res: Response) {
  try {
    const { wineInputs } = req.body;

    if (!Array.isArray(wineInputs)) {
      return res.status(400).json({ 
        error: 'wineInputs must be an array' 
      });
    }

    if (wineInputs.length > 50) {
      return res.status(400).json({ 
        error: 'Cannot verify more than 50 wines at once' 
      });
    }

    const verificationResults = await verifyMultipleWines(wineInputs);
    
    res.json({ results: verificationResults });

  } catch (error) {
    console.error('Batch wine verification API error:', error);
    res.status(500).json({ 
      error: 'Failed to verify wines' 
    });
  }
}