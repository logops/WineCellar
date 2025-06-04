import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedWine {
  name: string;
  producer: string;
  vintage: string;
  type: string;
  quantity: number;
  price: string;
  region?: string;
  subregion?: string;
  grapeVarieties?: string;
  vineyard?: string;
  bottleSize?: string;
  purchaseLocation?: string;
  purchaseDate?: string;
  notes?: string;
}

export async function parseWineReceipt(base64Image: string, mimeType: string): Promise<ParsedWine[]> {
  try {
    const prompt = `
    Analyze this wine purchase receipt/invoice and extract all wine-related items. 

    IMPORTANT INSTRUCTIONS:
    1. ONLY extract items that are actual wines (bottles of wine)
    2. EXCLUDE non-wine items such as:
       - Tasting fees (like "WC Comp Library", "Tasting Fee", etc.)
       - Merchandise (glasses, corkscrews, etc.)
       - Food items
       - Shipping charges
       - Service fees
       - Gift cards
    
    For each wine item found, extract:
    - Wine name (without vintage year)
    - Producer/Winery name
    - Vintage year
    - Wine type (Red, White, Rosé, Sparkling, Dessert, Fortified)
    - Quantity purchased
    - Price per bottle or total price
    - Region (if mentioned)
    - Subregion (if mentioned)
    - Grape varieties (if mentioned)
    - Bottle size (if mentioned, default to 750ml)
    
    Return the results as a JSON array. If no wines are found, return an empty array.
    
    Example format:
    [
      {
        "name": "Cabernet Sauvignon",
        "producer": "Sunbasket",
        "vintage": "2018",
        "type": "Red",
        "quantity": 1,
        "price": "225.00",
        "region": "Napa Valley",
        "bottleSize": "750ml"
      }
    ]
    `;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as any,
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('No JSON array found in response:', content.text);
      return [];
    }

    const parsedWines: ParsedWine[] = JSON.parse(jsonMatch[0]);
    
    // Validate and clean the data
    const cleanedWines = parsedWines.map(wine => ({
      name: wine.name || '',
      producer: wine.producer || '',
      vintage: wine.vintage || '',
      type: wine.type || 'Red',
      quantity: parseInt(String(wine.quantity)) || 1,
      price: String(wine.price || ''),
      region: wine.region || '',
      subregion: wine.subregion || '',
      grapeVarieties: wine.grapeVarieties || '',
      vineyard: wine.vineyard || '',
      bottleSize: wine.bottleSize || '750ml',
      purchaseLocation: wine.purchaseLocation || '',
      purchaseDate: wine.purchaseDate || '',
      notes: wine.notes || ''
    }));

    return cleanedWines;

  } catch (error) {
    console.error('Error parsing receipt with AI:', error);
    throw new Error('Failed to analyze receipt');
  }
}