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

  const prompt = `As a world-class sommelier and wine expert, analyze this wine and provide comprehensive information:

${wineDescription}

Please provide a detailed analysis in the following JSON format:
{
  "drinkingWindow": {
    "start": "YYYY",
    "end": "YYYY", 
    "confidence": "high|medium|low",
    "reasoning": "Detailed explanation of why this drinking window is recommended, considering vintage, producer quality, wine style, aging potential, etc."
  },
  "wineInfo": {
    "grapeVarieties": "Complete grape blend if not provided or enhanced information",
    "region": "Enhanced or corrected region information",
    "subregion": "Specific sub-region or appellation"
  },
  "additionalInfo": {
    "tastingNotes": "Professional tasting notes describing aroma, flavor profile, structure, and character. Include specific fruit, spice, earth, and oak notes typical of this producer and region.",
    "cellaring": "Detailed storage recommendations including optimal temperature, humidity, position, and any special considerations for this wine type and quality level.",
    "foodPairings": "Comprehensive food pairing suggestions including specific dishes, preparation styles, and ingredient combinations that complement this wine's characteristics."
  }
}

Ensure all recommendations are specific to this producer, vintage, and region. Base your analysis on the wine's likely characteristics given its provenance and style.`;

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

    const analysis = JSON.parse(content.text);
    return analysis;
  } catch (error) {
    console.error('Error enhancing wine with AI:', error);
    throw new Error(`Failed to enhance wine: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}