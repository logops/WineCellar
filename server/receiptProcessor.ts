import Anthropic from '@anthropic-ai/sdk';

interface ReceiptWine {
  name: string;
  producer: string;
  vintage: string;
  type: string;
  quantity: number;
  price: string;
  region?: string;
  subregion?: string;
  grapeVarieties?: string;
  bottleSize?: string;
  notes?: string;
}

interface ProcessedReceiptWine extends ReceiptWine {
  source: 'receipt';
  matchStatus: 'duplicate' | 'new';
  confidence: 'low' | 'medium' | 'high';
  isDuplicate: boolean;
  aiEnhanced?: boolean;
  drinkingWindowStart?: string;
  drinkingWindowEnd?: string;
  notes?: string;
}

export class ReceiptProcessor {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private getAnalysisPrompt(): string {
    return `
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
  }

  private createAnalysisContent(file: Express.Multer.File): any[] {
    const prompt = this.getAnalysisPrompt();
    const mimeType = file.mimetype;

    if (mimeType === 'application/pdf') {
      const base64Pdf = file.buffer.toString('base64');
      return [
        {
          type: 'text' as const,
          text: prompt
        },
        {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64Pdf
          }
        }
      ];
    } else {
      const base64Image = file.buffer.toString('base64');
      return [
        {
          type: 'text' as const,
          text: prompt
        },
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mimeType as any,
            data: base64Image
          }
        }
      ];
    }
  }

  private async enhanceWineWithAI(wine: ReceiptWine): Promise<Partial<ProcessedReceiptWine>> {
    try {
      const { enhanceWineWithAI } = await import('./aiWineEnhancement');
      const aiEnhancement = await enhanceWineWithAI({
        producer: wine.producer,
        wineName: wine.name,
        vintage: wine.vintage,
        wineType: wine.type,
        region: wine.region,
        grapeVarieties: wine.grapeVarieties,
        country: wine.region // fallback for country
      });

      const existingNotes = wine.notes || '';
      const enhancedNotes = existingNotes ? 
        `${existingNotes}\n\n${aiEnhancement.additionalInfo.tastingNotes}\n\nFood Pairings: ${aiEnhancement.additionalInfo.foodPairings}` :
        `${aiEnhancement.additionalInfo.tastingNotes}\n\nFood Pairings: ${aiEnhancement.additionalInfo.foodPairings}`;

      return {
        grapeVarieties: aiEnhancement.wineInfo.grapeVarieties || wine.grapeVarieties,
        region: aiEnhancement.wineInfo.region || wine.region,
        subregion: aiEnhancement.wineInfo.subregion || wine.subregion,
        drinkingWindowStart: aiEnhancement.drinkingWindow.start,
        drinkingWindowEnd: aiEnhancement.drinkingWindow.end,
        notes: enhancedNotes,
        aiEnhanced: true
      };
    } catch (error) {
      console.log('AI enhancement failed for receipt wine:', error);
      return {};
    }
  }

  private checkForDuplicates(wines: ReceiptWine[], existingWines: any[]): ReceiptWine[] {
    return wines.map(wine => {
      const isDuplicate = existingWines.some((existingWine: any) => 
        existingWine.producer?.toLowerCase() === wine.producer?.toLowerCase() &&
        existingWine.name?.toLowerCase() === wine.name?.toLowerCase() &&
        existingWine.vintage === parseInt(wine.vintage)
      );

      return {
        ...wine,
        isDuplicate,
        quantity: isDuplicate ? wine.quantity + 1 : wine.quantity
      } as ReceiptWine & { isDuplicate: boolean };
    });
  }

  async processReceipt(file: Express.Multer.File, existingWines: any[] = []): Promise<ProcessedReceiptWine[]> {
    try {
      console.log('Processing receipt:', file.originalname, 'Type:', file.mimetype);

      const analysisContent = this.createAnalysisContent(file);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: analysisContent
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI analysis');
      }

      // Parse the wine data from response
      let wineData: ReceiptWine[];
      try {
        const cleanedResponse = content.text
          .replace(/```json\s*/g, '')
          .replace(/```\s*$/g, '')
          .trim();
        
        wineData = JSON.parse(cleanedResponse);
        
        if (!Array.isArray(wineData)) {
          throw new Error('Expected array of wines');
        }
      } catch (parseError) {
        console.error('Failed to parse wine data:', parseError);
        throw new Error('Could not parse wine information from receipt');
      }

      console.log('Parsed wines from receipt:', wineData.length);

      // Check for duplicates
      const winesWithDuplicateInfo = this.checkForDuplicates(wineData, existingWines);

      // Process each wine with AI enhancement
      const processedWines = await Promise.all(
        winesWithDuplicateInfo.map(async (wine) => {
          try {
            const aiEnhancements = await this.enhanceWineWithAI(wine);
            const isDuplicate = (wine as any).isDuplicate;

            return {
              ...wine,
              ...aiEnhancements,
              source: 'receipt' as const,
              matchStatus: isDuplicate ? 'duplicate' as const : 'new' as const,
              confidence: 'medium' as const,
              isDuplicate
            };
          } catch (error) {
            console.error('Error processing receipt wine:', error);
            return {
              ...wine,
              source: 'receipt' as const,
              matchStatus: 'new' as const,
              confidence: 'low' as const,
              isDuplicate: false
            };
          }
        })
      );

      return processedWines;

    } catch (error) {
      console.error('Receipt processing error:', error);
      throw new Error('Failed to process receipt. Please try again.');
    }
  }
}