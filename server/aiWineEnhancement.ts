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
    cellaring: string;
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

  const prompt = `As a Master Sommelier, analyze this SPECIFIC wine (not generic wine types) and provide exact information about THIS wine:

${wineDescription}

Research this exact producer, vintage, and wine. Do not give generic advice about wine categories. Return structured data for database storage:

{
  "drinkingWindow": {
    "start": "YYYY",
    "end": "YYYY", 
    "confidence": "high|medium|low",
    "reasoning": "Specific analysis of THIS wine's current state and aging trajectory based on this exact producer's style, this vintage's characteristics, and this wine's specific attributes."
  },
  "wineInfo": {
    "grapeVarieties": "Exact grape varieties as comma-separated list (e.g. 'Cabernet Sauvignon, Merlot, Cabernet Franc')",
    "region": "Specific region name only (e.g. 'Rioja' not 'Rioja, Spain')",
    "subregion": "Exact sub-region/appellation only (e.g. 'Rioja Alta' not 'Likely Rioja Alta')"
  },
  "additionalInfo": {
    "tastingNotes": "Professional tasting notes for THIS specific wine based on the producer's known style, this vintage's characteristics, and typical profile of this exact bottling.",
    "foodPairings": "Specific food pairing recommendations that complement this wine's exact characteristics and style."
  }
}

IMPORTANT: 
- Research the exact producer and their specific winemaking style
- Consider this exact vintage's conditions and characteristics  
- Provide definitive data, not speculation with words like "likely" or "probably"
- Return clean strings suitable for database storage and filtering`;

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