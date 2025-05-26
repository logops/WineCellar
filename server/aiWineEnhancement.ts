import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface WineEnhancementData {
  drinkingWindow: {
    start: string;
    end: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  };
  wineInfo: {
    grapeVarieties?: string;
    region?: string;
    subregion?: string;
  };
  additionalInfo: {
    tastingNotes: string;
    foodPairings: string;
  };
}

export async function enhanceWineWithAI(wineData: any): Promise<WineEnhancementData> {
  const wineDescription = `
Wine Details:
- Producer: ${wineData.producer || 'Unknown'}
- Wine Name: ${wineData.wineName || 'Unknown'}
- Vintage: ${wineData.vintage || 'Unknown'}
- Region: ${wineData.region || 'Unknown'}
- Grape Varieties: ${wineData.grapeVarieties || 'Unknown'}
- Wine Type: ${wineData.wineType || 'Unknown'}
- Country: ${wineData.country || 'Unknown'}
`.trim();

  const prompt = `You are a wine expert assistant. Based on the wine details provided, analyze the wine and recommend an appropriate drinking window (start year and end year). 
Additionally, identify grape varieties, region, and other key information if they weren't provided.

FORMAT REQUIREMENTS FOR GRAPE VARIETIES:
For the "grapeVarieties" field, list ONLY the grape variety names themselves, separated by commas.
Do not include any of the following in your grape varieties response:
- Percentages or proportions
- Qualifiers like "primarily", "mainly", "predominantly", etc.
- Words like "blend", "variety", "components", etc.
- Uncertainty markers like "likely", "possibly", "appears to be", etc.

For wines from classic regions with known blends:
- For Bordeaux blends: List the actual grape varieties (e.g., "Cabernet Sauvignon, Merlot, Cabernet Franc")
- For Valpolicella: List the actual grape varieties (e.g., "Corvina, Corvinone, Rondinella")
- For Champagne: List the actual grape varieties (e.g., "Chardonnay, Pinot Noir, Pinot Meunier")

For region and subregion, enhance with more specific information when you know the producer's exact location:
- If you know the specific appellation or sub-region for this producer, provide that instead of broader regional designations
- For example: "Napa Valley" instead of "North Coast", "Pomerol" instead of "Bordeaux", "Barolo" instead of "Piedmont"
- Only provide definitive information without qualifying words like "likely" or "probably"

${wineDescription}

Today's date is ${new Date().toISOString().split('T')[0]}.

For grape varieties:
- FIRST: Check the wine name carefully - if it mentions specific grapes (e.g., "Cabernet Sauvignon", "Pinot Noir"), those grapes MUST be included in your response
- List ONLY the actual grape varietal names themselves, separated by commas
- For wines from classic regions (like Bordeaux, Valpolicella, Champagne), list the specific grape varieties they typically contain
- Do NOT use qualifiers, percentages, or uncertainty markers
- Simply list the grape names themselves, comma-separated
- CRITICAL: Your grape varieties must be logically consistent with the wine name - never contradict what's explicitly stated in the wine name

Respond only with JSON as specified. Use numeric values for years, not strings.
For any fields where you're uncertain, provide your best estimate based on similar wines.
If you have absolutely no information to determine a field, use null for that field.

JSON format:
{
  "start": 2025,
  "end": 2030,
  "confidence": "high/medium/low",
  "reasoning": "Brief explanation of your recommendation",
  "grapeVarieties": "...",
  "region": "...",
  "subregion": "...",
  "notes": "...",
  "pairings": "..."
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }

    // Remove markdown code blocks if present
    let jsonText = content.text.trim();
    // Handle various markdown formats
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    // Find the first { and last } to extract just the JSON
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }
    
    const rawAnalysis = JSON.parse(jsonText);
    
    // Transform the response to match our interface
    const analysis: WineEnhancementData = {
      drinkingWindow: {
        start: rawAnalysis.start?.toString() || '2025',
        end: rawAnalysis.end?.toString() || '2030', 
        confidence: rawAnalysis.confidence || 'medium',
        reasoning: rawAnalysis.reasoning || 'Analysis based on wine characteristics'
      },
      wineInfo: {
        grapeVarieties: rawAnalysis.grapeVarieties || undefined,
        region: rawAnalysis.region || undefined,
        subregion: rawAnalysis.subregion || undefined
      },
      additionalInfo: {
        tastingNotes: rawAnalysis.notes || 'Professional tasting notes for this wine',
        foodPairings: rawAnalysis.pairings || 'Food pairing suggestions for this wine'
      }
    };
    
    return analysis;
  } catch (error) {
    console.error('Error enhancing wine with AI:', error);
    throw new Error(`Failed to enhance wine: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}