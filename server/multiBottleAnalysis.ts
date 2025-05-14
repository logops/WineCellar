import { Request, Response } from 'express';
import { anthropic } from './anthropic';

// Interface for storing the position of a wine bottle in the image
interface WinePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Interface for a detected wine bottle
interface WineBottleAnalysis {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  grapeVarieties: string | null;
  type: string | null;
  alcoholContent: number | null;
  confidence: number;
  isReadable: boolean;
  bottlePosition?: WinePosition;
  notes?: string;
  recommendedDrinkingWindow?: {
    startYear: number;
    endYear: number;
    isPastPrime: boolean;
    notes: string;
  };
}

// Interface for the multi-bottle analysis result
interface MultiBottleResult {
  bottles: WineBottleAnalysis[];
}

/**
 * Analyze multiple wine bottles in a single image
 * @param base64Image The base64-encoded image to analyze
 * @returns Promise with analysis results
 */
export async function analyzeMultipleWineBottles(base64Image: string): Promise<MultiBottleResult> {
  try {
    // Extract the base64 data from the data URL
    let imageBase64 = base64Image;
    if (base64Image.includes(',')) {
      imageBase64 = base64Image.split(',')[1];
    }

    // Prepare the prompt for Claude Vision to detect and analyze multiple wine bottles
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      temperature: 0.2,
      system: `You are a wine label analysis expert. Your task is to detect multiple wine bottles in an image and analyze each bottle separately. 
      For each bottle, extract the following information:
      1. Location in the image (normalized x, y, width, height coordinates between 0 and 1)
      2. Producer/winery name
      3. Wine name
      4. Vintage (year)
      5. Region
      6. Subregion (if visible)
      7. Country (if visible)
      8. Grape varieties (if visible)
      9. Type (red, white, rosé, sparkling)
      10. Alcohol content % (if visible)
      
      Important guidelines:
      - Remove qualifying words like "possibly", "likely", "appears to be" from your final answers.
      - Never guess or approximate grape varieties, only include varieties clearly stated on the label.
      - For grape varieties, separate with commas instead of using "and" for consistent formatting.
      - Do not include any uncertainty qualifiers in the data - either report what you can clearly see or report null.
      - Mark bottles as unreadable if you cannot identify the producer and name with reasonable confidence.
      - For each bottle, provide a confidence score between 0 and 1 that reflects how confident you are in your analysis.
      
      Return a valid JSON object with this structure:
      {
        "bottles": [
          {
            "bottlePosition": {"x": float, "y": float, "width": float, "height": float},
            "producer": string | null,
            "name": string | null,
            "vintage": number | null,
            "region": string | null,
            "subregion": string | null,
            "country": string | null,
            "grapeVarieties": string | null,
            "type": string | null,
            "alcoholContent": number | null,
            "confidence": float,
            "isReadable": boolean,
            "notes": string
          },
          ...
        ]
      }`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text", 
              text: "Detect all wine bottles in this image. For each bottle, extract the information as described in your instructions and return it as a valid JSON object. If a bottle's label is unreadable, mark it as such but still include its position."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64
              }
            }
          ]
        }
      ]
    });

    // Parse the response to get the bottles information
    const responseText = response.content[0].text;
    
    // Extract JSON object from the response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from AI response");
    }
    
    const jsonStr = jsonMatch[0];
    const result: MultiBottleResult = JSON.parse(jsonStr);
    
    // Ensure the result has the expected structure
    if (!result.bottles || !Array.isArray(result.bottles)) {
      throw new Error("Invalid response format from AI");
    }
    
    // Clean up any issues with the data
    result.bottles = result.bottles.map(bottle => {
      // Ensure confidence is a number between 0 and 1
      if (typeof bottle.confidence !== 'number') {
        bottle.confidence = 0.5;
      }
      bottle.confidence = Math.max(0, Math.min(1, bottle.confidence));
      
      // Ensure isReadable is a boolean
      if (typeof bottle.isReadable !== 'boolean') {
        bottle.isReadable = !!bottle.producer && !!bottle.name;
      }
      
      // Convert vintage to number or null
      if (bottle.vintage) {
        bottle.vintage = parseInt(String(bottle.vintage), 10) || null;
      }
      
      // Ensure the bottle position is normalized between 0 and 1
      if (bottle.bottlePosition) {
        const pos = bottle.bottlePosition;
        pos.x = Math.max(0, Math.min(1, pos.x));
        pos.y = Math.max(0, Math.min(1, pos.y));
        pos.width = Math.max(0, Math.min(1, pos.width));
        pos.height = Math.max(0, Math.min(1, pos.height));
      }
      
      return bottle;
    });
    
    return result;
  } catch (error) {
    console.error("Error analyzing wine bottles:", error);
    throw error;
  }
}

/**
 * Handle multi-bottle analysis requests
 */
export async function handleMultiBottleAnalysis(req: Request, res: Response) {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: "No image data provided" });
    }
    
    const result = await analyzeMultipleWineBottles(imageData);
    
    return res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error("Error handling multi-bottle analysis:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error analyzing wine bottles" 
    });
  }
}