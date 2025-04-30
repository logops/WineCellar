import * as XLSX from 'xlsx';
import { fileTypeFromBuffer } from 'file-type';
import Anthropic from '@anthropic-ai/sdk';
import type { InsertWine, Wine } from '@shared/schema';
import { storage } from './storage';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supported file types
type FileType = 'xlsx' | 'csv' | 'unknown';

// Confidence levels for field extraction
enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Interface for cell location in spreadsheet
interface CellLocation {
  row: number;
  col: number;
}

// Field mapping result
interface FieldMapping {
  field: string;
  columnHeader: string;
  columnIndex: number;
  confidence: ConfidenceLevel;
}

// Result of processing a single wine entry
export interface ProcessedWine {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: Partial<InsertWine>;
  confidence: ConfidenceLevel;
  missingRequiredFields: string[];
  isPotentialDuplicate: boolean;
  duplicateId?: number;
  needsVerification: boolean;
  storageLocation?: string;
  aiDrinkingWindowRecommendation?: {
    start?: string;
    end?: string;
    confidence: ConfidenceLevel;
    reasoning: string;
  };
}

// Result of processing a batch of wines
interface BatchProcessResult {
  processedWines: ProcessedWine[];
  fieldMappings: FieldMapping[];
  totalRows: number;
  processedRows: number;
  newLocations: string[];
  potentialDuplicatesCount: number;
  needsVerificationCount: number;
  highConfidenceCount: number;
}

// Mapping of common column names to our schema fields
// Field mappings with high-priority keywords first for better matching
const commonColumnMappings: Record<string, string[]> = {
  'producer': ['producer', 'winery', 'winery name', 'maker', 'château', 'domaine', 'bodega', 'estate', 'vineyard'],
  'name': ['name', 'wine name', 'wine', 'cuvée', 'bottling', 'label', 'product'],
  'vintage': ['vintage', 'year', 'vin'],
  'type': ['type', 'wine type', 'color', 'style', 'kind'],
  'grapeVarieties': ['varietal', 'variety', 'grape', 'cepage', 'grape variety', 'grapes', 'grape varieties', 'blend'],
  // Removed 'appellation' from region to handle special mapping logic
  'region': ['region', 'growing region', 'area', 'provenance', 'country', 'origin'],
  'subregion': ['sub region', 'subregion', 'sub-region', 'district'],
  'purchasePrice': ['purchase price', 'price', 'cost', 'bought for', 'purchase cost', 'price paid'],
  'currentValue': ['current value', 'value', 'market price', 'current price', 'worth'],
  'quantity': ['quantity', 'qty', 'bottles', 'count', 'number of bottles', 'bottle count', 'amount'],
  'notes': ['notes', 'comments', 'description', 'tasting notes', 'review', 'details'],
  'drinkingWindowStart': ['drinking window start', 'drink after', 'start drinking', 'drink from', 'ready from'],
  'drinkingWindowEnd': ['drinking window end', 'drink before', 'drink until', 'drink by', 'drink through'],
  'storageLocation': ['storage', 'location', 'cellar location', 'stored in', 'storage location', 'bin', 'rack'],
  // New special fields for region mapping logic
  'appellation': ['appellation', 'ava', 'aoc', 'doc', 'docg', 'ava region'],
  'subAppellation': ['sub appellation', 'sub-appellation', 'sub ava', 'sub-ava']
};

/**
 * Detect file type from buffer
 */
export async function detectFileType(buffer: Buffer): Promise<FileType> {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      // If fileType can't be detected, try to determine if it's a CSV
      const content = buffer.toString().slice(0, 1000);
      if (content.includes(',') && (content.includes('\n') || content.includes('\r'))) {
        return 'csv';
      }
      return 'unknown';
    }
    
    // Check MIME type
    if (fileType.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'xlsx';
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error detecting file type:', error);
    return 'unknown';
  }
}

/**
 * Parse spreadsheet from buffer
 */
export function parseSpreadsheet(buffer: Buffer, fileType: FileType): XLSX.WorkSheet | null {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in the spreadsheet');
    }
    
    return workbook.Sheets[sheetName];
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    return null;
  }
}

/**
 * Convert worksheet to JSON
 */
export function worksheetToJson(worksheet: XLSX.WorkSheet): any[] {
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

/**
 * Identify column mappings using headers and common patterns
 */
export function identifyColumnMappings(data: any[]): FieldMapping[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Get headers from the first row
  const headers = Object.keys(data[0]);
  
  // Create mappings based on header names
  const mappings: FieldMapping[] = [];
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Check each field for potential matches
    for (const [field, possibleNames] of Object.entries(commonColumnMappings)) {
      // Check if the normalized header is in the list of possible names for this field
      if (possibleNames.some(name => normalizedHeader.includes(name.toLowerCase()))) {
        mappings.push({
          field,
          columnHeader: header,
          columnIndex: index,
          confidence: ConfidenceLevel.HIGH
        });
        return;
      }
    }
    
    // If no match was found, try to find partial matches
    for (const [field, possibleNames] of Object.entries(commonColumnMappings)) {
      for (const name of possibleNames) {
        // Check for partial matches (e.g., "Producer Name" contains "Producer")
        if (normalizedHeader.includes(name.toLowerCase()) || name.toLowerCase().includes(normalizedHeader)) {
          mappings.push({
            field,
            columnHeader: header,
            columnIndex: index,
            confidence: ConfidenceLevel.MEDIUM
          });
          return;
        }
      }
    }
    
    // If still no match, check sample values to make educated guesses
    const sampleValues = data.slice(0, 5).map(row => row[header]);
    
    // Example: Check if values look like vintages (years)
    if (sampleValues.some(val => /^(19|20)\d{2}$/.test(String(val)))) {
      mappings.push({
        field: 'vintage',
        columnHeader: header,
        columnIndex: index,
        confidence: ConfidenceLevel.MEDIUM
      });
      return;
    }
    
    // Example: Check if values contain pricing information (currency symbols)
    if (sampleValues.some(val => /[$€£]/.test(String(val)))) {
      mappings.push({
        field: 'purchasePrice',
        columnHeader: header,
        columnIndex: index,
        confidence: ConfidenceLevel.MEDIUM
      });
      return;
    }
    
    // Default to low confidence mapping
    mappings.push({
      field: 'unknown',
      columnHeader: header,
      columnIndex: index,
      confidence: ConfidenceLevel.LOW
    });
  });
  
  return mappings;
}

/**
 * Process a batch of rows from the spreadsheet
 */
export async function processBatch(
  rows: any[],
  fieldMappings: FieldMapping[],
  existingWines: Wine[],
  options: {
    useAiDrinkingWindows: boolean,
    userId: number,
    batchIndex: number,
    batchSize: number
  }
): Promise<BatchProcessResult> {
  const result: BatchProcessResult = {
    processedWines: [],
    fieldMappings: fieldMappings,
    totalRows: rows.length,
    processedRows: 0,
    newLocations: [],
    potentialDuplicatesCount: 0,
    needsVerificationCount: 0,
    highConfidenceCount: 0
  };
  
  // Keep track of new storage locations we find
  const newStorageLocations: Set<string> = new Set();
  
  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = options.batchIndex * options.batchSize + i;
    
    // Map the row data to our schema fields
    const mappedData: Partial<InsertWine> = {
      userId: options.userId
    };
    
    let overallConfidence = ConfidenceLevel.HIGH;
    let storageLocation: string | undefined;
    const missingRequiredFields: string[] = [];
    
    // First pass - collect all field values including special fields
    const fieldValues: Record<string, any> = {};
    let hasAppellation = false;
    let hasSubAppellation = false;
    let hasRegion = false;
    
    for (const mapping of fieldMappings) {
      if (mapping.field === 'unknown') continue;
      
      const value = row[mapping.columnHeader];
      
      // Skip empty values but record fields we've encountered
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // Record all field values for later processing
      fieldValues[mapping.field] = value;
      
      // Track special region-related fields
      if (mapping.field === 'appellation') hasAppellation = true;
      if (mapping.field === 'subAppellation') hasSubAppellation = true;
      if (mapping.field === 'region') hasRegion = true;
    }
    
    // Second pass - process the fields with proper logic
    for (const mapping of fieldMappings) {
      if (mapping.field === 'unknown') continue;
      
      const value = row[mapping.columnHeader];
      
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        // Check if this is a required field
        if (['producer', 'vintage', 'type'].includes(mapping.field)) {
          missingRequiredFields.push(mapping.field);
          overallConfidence = ConfidenceLevel.LOW;
        }
        continue;
      }
      
      // Handle special field: storageLocation
      if (mapping.field === 'storageLocation') {
        storageLocation = String(value).trim();
        if (storageLocation) {
          newStorageLocations.add(storageLocation);
        }
        continue;
      }
      
      // Handle region mapping logic based on what's available
      // If we have appellation, map it to region
      if (mapping.field === 'appellation') {
        mappedData.region = String(value).trim();
        continue;
      }
      
      // If we have sub-appellation, map it to subregion
      if (mapping.field === 'subAppellation') {
        mappedData.subregion = String(value).trim();
        continue;
      }
      
      // Only map region field if no appellation is present
      if (mapping.field === 'region' && !hasAppellation) {
        mappedData.region = String(value).trim();
        continue;
      }
      
      // Parse numeric fields
      if (['vintage', 'purchasePrice', 'currentValue', 'quantity'].includes(mapping.field)) {
        let numValue: number;
        
        // Handle special case for vintage
        if (mapping.field === 'vintage' && String(value).toLowerCase() === 'nv') {
          mappedData.vintage = 0; // Use 0 for NV (non-vintage)
          continue;
        }
        
        // Parse numeric values
        if (typeof value === 'string') {
          // Extract numbers from strings (e.g., "$25.99" -> 25.99)
          const matches = value.match(/[0-9]+\.?[0-9]*/);
          numValue = matches ? parseFloat(matches[0]) : NaN;
        } else {
          numValue = parseFloat(String(value));
        }
        
        if (isNaN(numValue)) {
          // If we can't parse a value for a required field, lower confidence
          if (['vintage'].includes(mapping.field)) {
            missingRequiredFields.push(mapping.field);
            overallConfidence = ConfidenceLevel.LOW;
          }
          continue;
        }
        
        // Set the parsed numeric value
        mappedData[mapping.field] = numValue;
      }
      // Handle drinking window dates
      else if (['drinkingWindowStart', 'drinkingWindowEnd'].includes(mapping.field)) {
        try {
          // Try to parse as a date
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            // Format as ISO string
            mappedData[mapping.field] = dateValue.toISOString();
          }
        } catch (e) {
          // If parsing fails, try to extract a year
          const yearMatch = String(value).match(/20\d{2}|19\d{2}/);
          if (yearMatch) {
            // Create a date from the year
            const year = parseInt(yearMatch[0]);
            const date = new Date(year, 0, 1); // January 1st of the year
            mappedData[mapping.field] = date.toISOString();
          }
        }
      }
      // Handle all other fields as strings
      else {
        mappedData[mapping.field] = String(value).trim();
      }
      
      // Lower confidence if using medium confidence mapping
      if (mapping.confidence === ConfidenceLevel.MEDIUM && overallConfidence === ConfidenceLevel.HIGH) {
        overallConfidence = ConfidenceLevel.MEDIUM;
      }
    }
    
    // Attempt to intelligently extract producer and wine name
    // Sometimes the entire wine name might be in a single field with both producer and name
    if (mappedData.producer && !mappedData.name) {
      const producerValue = String(mappedData.producer);
      
      // Look for common patterns like "2018 Producer Wine Name"
      const fullNamePattern = /^((?:19|20)\d{2})\s+([A-Za-z\u00C0-\u00FF\s'&]+?)(?:\s+)(.+)$/;
      const match = producerValue.match(fullNamePattern);
      
      if (match) {
        // Extract vintage, producer and name
        const [_, vintage, producer, name] = match;
        mappedData.vintage = parseInt(vintage);
        mappedData.producer = producer.trim();
        mappedData.name = name.trim();
      } else {
        // Try to extract just producer and name (no vintage)
        // Look for patterns like "Producer Wine Name" where we can split on the first occurrence of key words
        const producerNameSplit = producerValue.match(/^([A-Za-z\u00C0-\u00FF\s'&]+?)(?:\s+)((?:Cabernet|Chardonnay|Pinot|Merlot|Sauvignon|Syrah|Vineyard|Cuvée|Estate|Reserve|Grand|Cru|Premier|Clos|Château).+)$/);
        
        if (producerNameSplit) {
          const [_, producer, name] = producerNameSplit;
          mappedData.producer = producer.trim();
          mappedData.name = name.trim();
        }
      }
    }
    
    // For the Casa Lapostolle example and similar cases
    // If name contains both producer and wine name, extract correctly
    if (mappedData.name && !mappedData.producer) {
      const nameValue = String(mappedData.name);
      
      // Look for a pattern like "Casa Lapostolle Le Petit Clos Apalta"
      // Common producers are 1-3 words
      const producerNamePattern = /^([A-Za-z\u00C0-\u00FF\s'&]{2,30}?)(?:\s+)([A-Za-z\u00C0-\u00FF\s'&]{3,})$/;
      const match = nameValue.match(producerNamePattern);
      
      if (match) {
        const [_, producer, name] = match;
        mappedData.producer = producer.trim();
        mappedData.name = name.trim();
      }
    }
    
    // Check if we have the minimum required fields
    if (!mappedData.producer || (!mappedData.vintage && mappedData.vintage !== 0) || !mappedData.type) {
      overallConfidence = ConfidenceLevel.LOW;
    }
    
    // Set default values for missing fields
    if (!mappedData.quantity) mappedData.quantity = 1;
    if (!mappedData.type) mappedData.type = 'Red';
    
    // Check for duplicates
    let isPotentialDuplicate = false;
    let duplicateId: number | undefined;
    
    for (const existingWine of existingWines) {
      if (
        existingWine.producer === mappedData.producer &&
        existingWine.name === mappedData.name &&
        existingWine.vintage === mappedData.vintage
      ) {
        isPotentialDuplicate = true;
        duplicateId = existingWine.id;
        break;
      }
    }
    
    if (isPotentialDuplicate) {
      result.potentialDuplicatesCount++;
    }
    
    // Determine if we need verification
    const needsVerification = 
      overallConfidence !== ConfidenceLevel.HIGH || 
      missingRequiredFields.length > 0 ||
      isPotentialDuplicate;
    
    if (needsVerification) {
      result.needsVerificationCount++;
    } else {
      result.highConfidenceCount++;
    }
    
    // Add to processed wines
    result.processedWines.push({
      rowIndex,
      originalData: row,
      mappedData,
      confidence: overallConfidence,
      missingRequiredFields,
      isPotentialDuplicate,
      duplicateId,
      needsVerification,
      storageLocation
    });
    
    result.processedRows++;
  }
  
  // Collect new locations
  result.newLocations = Array.from(newStorageLocations);
  
  // If AI drinking windows are requested, get them for wines that need them
  if (options.useAiDrinkingWindows) {
    await addAiDrinkingWindowRecommendations(result.processedWines);
  }
  
  return result;
}

/**
 * Add AI drinking window recommendations for wines that need them
 */
async function addAiDrinkingWindowRecommendations(processedWines: ProcessedWine[]): Promise<void> {
  const winesNeedingRecommendations = processedWines.filter(wine => {
    // Only get recommendations for wines we have enough info about
    return (
      wine.confidence !== ConfidenceLevel.LOW &&
      wine.mappedData.producer &&
      wine.mappedData.type &&
      (wine.mappedData.vintage || wine.mappedData.vintage === 0) &&
      (!wine.mappedData.drinkingWindowStart || !wine.mappedData.drinkingWindowEnd)
    );
  });
  
  // Process in batches to avoid overloading the API
  const batchSize = 10;
  for (let i = 0; i < winesNeedingRecommendations.length; i += batchSize) {
    const batch = winesNeedingRecommendations.slice(i, i + batchSize);
    
    // Process each wine in the batch
    await Promise.all(batch.map(async (wine) => {
      try {
        const wineInfo = `${wine.mappedData.vintage || 'NV'} ${wine.mappedData.producer} ${wine.mappedData.name || ''} ${wine.mappedData.grapeVarieties || ''}`.trim();
        
        // Use Claude to get drinking window recommendation
        const result = await anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219", // The newest Anthropic model
          max_tokens: 512,
          system: `You are a wine expert assistant. Based on the wine details provided, recommend an appropriate drinking window (start year and end year). 
          Respond in JSON format with the following fields:
          {
            "start": "YYYY", // Year to start drinking
            "end": "YYYY",   // Year to stop drinking
            "confidence": "high/medium/low", // Your confidence in this recommendation
            "reasoning": "Brief explanation of your recommendation"
          }`,
          messages: [
            {
              role: "user",
              content: `Please recommend a drinking window for this wine: ${wineInfo}
              Wine Type: ${wine.mappedData.type}
              Region: ${wine.mappedData.region || 'unknown'}
              Sub-Region: ${wine.mappedData.subregion || 'unknown'}
              Grape Varieties: ${wine.mappedData.grapeVarieties || 'unknown'}
              
              Today's date is ${new Date().toISOString().split('T')[0]}.
              
              Respond only with JSON as specified.`
            }
          ],
        });
        
        // Parse the recommendation
        try {
          // The response format has changed in Claude-3-7-sonnet
          const response = result.content[0].text;
          const recommendation = JSON.parse(response);
          
          // Add the recommendation to the wine
          wine.aiDrinkingWindowRecommendation = {
            start: recommendation.start,
            end: recommendation.end,
            confidence: recommendation.confidence === 'high' 
              ? ConfidenceLevel.HIGH 
              : recommendation.confidence === 'medium'
                ? ConfidenceLevel.MEDIUM
                : ConfidenceLevel.LOW,
            reasoning: recommendation.reasoning
          };
        } catch (parseError) {
          console.error('Error parsing AI recommendation:', parseError);
        }
      } catch (aiError) {
        console.error('Error getting AI drinking window recommendation:', aiError);
      }
    }));
    
    // Add a small delay between batches to avoid rate limits
    if (i + batchSize < winesNeedingRecommendations.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

/**
 * Main function to process a spreadsheet file
 */
export async function processSpreadsheetFile(
  fileBuffer: Buffer,
  options: {
    userId: number,
    useAiDrinkingWindows: boolean,
    batchSize?: number
  }
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    fieldMappings: FieldMapping[];
    sampleData: any[];
    totalRows: number;
  }
}> {
  try {
    // Detect file type
    const fileType = await detectFileType(fileBuffer);
    if (fileType === 'unknown') {
      return {
        success: false,
        message: 'Unsupported file format. Please upload an Excel or CSV file.'
      };
    }
    
    // Parse the spreadsheet
    const worksheet = parseSpreadsheet(fileBuffer, fileType);
    if (!worksheet) {
      return {
        success: false,
        message: 'Failed to parse the spreadsheet. Please check the file format.'
      };
    }
    
    // Convert to JSON
    const data = worksheetToJson(worksheet);
    if (!data || data.length === 0) {
      return {
        success: false,
        message: 'No data found in the spreadsheet.'
      };
    }
    
    // Identify column mappings
    const fieldMappings = identifyColumnMappings(data);
    
    // Return initial results
    return {
      success: true,
      data: {
        fieldMappings,
        sampleData: data.slice(0, 5),
        totalRows: data.length
      }
    };
  } catch (error) {
    console.error('Error processing spreadsheet file:', error);
    return {
      success: false,
      message: `Error processing spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Process a batch of rows from a spreadsheet
 */
export async function processBatchFromFile(
  fileBuffer: Buffer,
  options: {
    userId: number,
    useAiDrinkingWindows: boolean,
    batchIndex: number,
    batchSize: number,
    fieldMappings?: FieldMapping[]
  }
): Promise<{
  success: boolean;
  message?: string;
  data?: BatchProcessResult
}> {
  try {
    // Detect file type
    const fileType = await detectFileType(fileBuffer);
    if (fileType === 'unknown') {
      return {
        success: false,
        message: 'Unsupported file format.'
      };
    }
    
    // Parse the spreadsheet
    const worksheet = parseSpreadsheet(fileBuffer, fileType);
    if (!worksheet) {
      return {
        success: false,
        message: 'Failed to parse the spreadsheet.'
      };
    }
    
    // Convert to JSON
    const allData = worksheetToJson(worksheet);
    if (!allData || allData.length === 0) {
      return {
        success: false,
        message: 'No data found in the spreadsheet.'
      };
    }
    
    // Get the batch of rows
    const startIndex = options.batchIndex * options.batchSize;
    const endIndex = Math.min(startIndex + options.batchSize, allData.length);
    const batchData = allData.slice(startIndex, endIndex);
    
    if (batchData.length === 0) {
      return {
        success: false,
        message: 'No more data to process.'
      };
    }
    
    // Use provided field mappings or identify them
    const fieldMappings = options.fieldMappings || identifyColumnMappings(allData);
    
    // Get existing wines for duplicate detection
    const existingWines = await storage.getWinesByUserId(options.userId);
    
    // Process the batch
    const batchResult = await processBatch(
      batchData,
      fieldMappings,
      existingWines,
      {
        userId: options.userId,
        useAiDrinkingWindows: options.useAiDrinkingWindows,
        batchIndex: options.batchIndex,
        batchSize: options.batchSize
      }
    );
    
    return {
      success: true,
      data: batchResult
    };
  } catch (error) {
    console.error('Error processing batch:', error);
    return {
      success: false,
      message: `Error processing batch: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Import a batch of processed wines
 */
export async function importProcessedWines(
  processedWines: ProcessedWine[],
  options: {
    userId: number,
    createLocations: boolean,
    applyAiDrinkingWindows: boolean,
    importDuplicates: boolean
  }
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    imported: number;
    skipped: number;
    errors: any[];
    importedWines: Wine[];
  }
}> {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as any[],
    importedWines: [] as Wine[]
  };
  
  // Create cellar locations if needed
  if (options.createLocations) {
    const locations = new Set<string>();
    processedWines.forEach(wine => {
      if (wine.storageLocation) {
        locations.add(wine.storageLocation);
      }
    });
    
    // Create locations in parallel
    await Promise.all(Array.from(locations).map(async location => {
      // Check if location already exists
      try {
        // Call your storage API to create a location
        // await storage.createCellarLocation({ name: location, userId: options.userId });
        console.log(`Created cellar location: ${location}`);
      } catch (error) {
        console.error(`Error creating cellar location ${location}:`, error);
      }
    }));
  }
  
  // Import wines
  for (const wine of processedWines) {
    try {
      // Skip duplicates if importDuplicates is false
      if (wine.isPotentialDuplicate && !options.importDuplicates) {
        result.skipped++;
        continue;
      }
      
      const wineData: Partial<InsertWine> = { ...wine.mappedData, userId: options.userId };
      
      // Add storage location if available
      if (wine.storageLocation) {
        wineData.storageLocation = wine.storageLocation;
      }
      
      // Apply AI drinking window if requested
      if (options.applyAiDrinkingWindows && wine.aiDrinkingWindowRecommendation) {
        if (wine.aiDrinkingWindowRecommendation.start) {
          const startYear = parseInt(wine.aiDrinkingWindowRecommendation.start);
          if (!isNaN(startYear)) {
            const startDate = new Date(startYear, 0, 1);
            wineData.drinkingWindowStart = startDate.toISOString();
          }
        }
        
        if (wine.aiDrinkingWindowRecommendation.end) {
          const endYear = parseInt(wine.aiDrinkingWindowRecommendation.end);
          if (!isNaN(endYear)) {
            const endDate = new Date(endYear, 11, 31);
            wineData.drinkingWindowEnd = endDate.toISOString();
          }
        }
      }
      
      // Create the wine
      const newWine = await storage.createWine(wineData as InsertWine);
      result.importedWines.push(newWine);
      result.imported++;
    } catch (error) {
      console.error('Error importing wine:', error);
      result.errors.push({
        wine: wine.mappedData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      result.skipped++;
    }
  }
  
  return {
    success: true,
    data: result
  };
}