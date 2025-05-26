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

  const prompt = `As a Master Sommelier, analyze this SPECIFIC wine and return EXACT database-ready information:

${wineDescription}

You must research this exact producer and wine. Return ONLY the JSON format below with NO SENTENCES in grape varieties, region, or subregion fields:

{
  "drinkingWindow": {
    "start": "YYYY",
    "end": "YYYY", 
    "confidence": "high|medium|low",
    "reasoning": "Specific analysis of THIS exact wine's aging trajectory based on this producer's known style and this vintage."
  },
  "wineInfo": {
    "grapeVarieties": "ONLY comma-separated grape names: Tempranillo, Graciano, Mazuelo",
    "region": "ONLY region name: Rioja",
    "subregion": "ONLY sub-region name: Rioja Alta"
  },
  "additionalInfo": {
    "tastingNotes": "Professional tasting notes for this specific wine and vintage.",
    "foodPairings": "Specific food pairings for this wine's profile."
  }
}

CRITICAL RULES:
- grapeVarieties: ONLY grape names separated by commas, NO percentages, NO sentences
- region: ONLY the region name, NO country, NO descriptive text  
- subregion: ONLY the sub-region name, NO speculation words like "likely"
- Research the EXACT producer - do not give generic wine category advice
- This is for database storage - clean strings only`;

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
    
    const analysis = JSON.parse(jsonText);
    return analysis;
  } catch (error) {
    console.error('Error enhancing wine with AI:', error);
    throw new Error(`Failed to enhance wine: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}