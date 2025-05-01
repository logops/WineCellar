import { fileTypeFromBuffer } from 'file-type';
import * as XLSX from 'xlsx';
import * as schema from '@shared/schema';
import { InsertWine, Wine } from '@shared/schema';
import { db } from './db';
import { storage } from './storage';
import { identifySpreadsheetColumns } from './anthropic';

// Use anthropic client from anthropic.ts file

type FileType = 'xlsx' | 'csv' | 'unknown';

enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

interface CellLocation {
  row: number;
  col: number;
}

interface FieldMapping {
  field: string;
  columnHeader: string;
  columnIndex: number;
  confidence: ConfidenceLevel;
}

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

/**
 * Detect file type from buffer
 */
export async function detectFileType(buffer: Buffer): Promise<FileType> {
  console.log('Detecting file type for uploaded file');
  
  try {
    const result = await fileTypeFromBuffer(buffer);
    console.log('File type detection result:', result);
    
    if (!result) {
      console.log('No file type detected, checking for CSV or Excel signature');
      // If file-type can't determine, check for CSV
      const sample = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));
      
      // Simple CSV detection: looks for multiple lines with commas
      const lines = sample.split('\n').filter(line => line.trim().length > 0);
      const hasCommas = lines.filter(line => line.includes(',')).length > 1;
      
      // Check for Excel file signature (PK zip file header for .xlsx)
      const hasExcelSignature = buffer.length > 4 && 
                               buffer[0] === 0x50 && 
                               buffer[1] === 0x4B && 
                               buffer[2] === 0x03 && 
                               buffer[3] === 0x04;
      
      // Check for old Excel format (.xls) signature
      const hasOldExcelSignature = buffer.length > 8 && 
                                  buffer[0] === 0xD0 && 
                                  buffer[1] === 0xCF && 
                                  buffer[2] === 0x11 && 
                                  buffer[3] === 0xE0;
      
      if (hasExcelSignature || hasOldExcelSignature) {
        console.log('Excel signature detected');
        return 'xlsx';
      }
      
      if (hasCommas) {
        console.log('CSV detected');
        return 'csv';
      }
      
      console.log('Unknown file type');
      return 'unknown';
    }
    
    // Check for Excel formats
    if (
      result.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      result.mime === 'application/vnd.ms-excel' ||
      result.mime === 'application/zip' // Some Excel files are detected as zip
    ) {
      console.log('Excel format detected');
      return 'xlsx';
    }
    
    // Check for CSV formats
    if (
      result.mime === 'text/csv' ||
      result.mime === 'text/plain'
    ) {
      console.log('CSV format detected');
      return 'csv';
    }
    
    console.log('Unknown MIME type:', result.mime);
    return 'unknown';
  } catch (error) {
    console.error('Error detecting file type:', error);
    // Try a simple check as fallback
    try {
      // Try parsing as XLSX anyway
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
        console.log('Successfully parsed as Excel despite detection failure');
        return 'xlsx';
      }
    } catch (xlsxError) {
      // Not an Excel file, try CSV
      try {
        const sample = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));
        const lines = sample.split('\n').filter(line => line.trim().length > 0);
        const hasCommas = lines.filter(line => line.includes(',')).length > 1;
        
        if (hasCommas) {
          console.log('Fallback CSV detection succeeded');
          return 'csv';
        }
      } catch (csvError) {
        // Ignore
      }
    }
    
    return 'unknown';
  }
}

/**
 * Parse spreadsheet from buffer
 */
export function parseSpreadsheet(buffer: Buffer, fileType: FileType): XLSX.WorkSheet | null {
  try {
    console.log(`Parsing spreadsheet file as ${fileType}`);
    let readOptions: XLSX.ParsingOptions = { type: 'buffer' };
    
    // Add specific options for different file types
    if (fileType === 'csv') {
      readOptions = { 
        ...readOptions,
        raw: false,
        cellText: true,
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      };
    }
    
    // Read the workbook
    const workbook = XLSX.read(buffer, readOptions);
    
    // Check if workbook was parsed successfully
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.error('Failed to parse workbook or no sheets found');
      return null;
    }
    
    console.log(`Found sheets: ${workbook.SheetNames.join(', ')}`);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      console.error(`Sheet ${sheetName} not found in workbook`);
      return null;
    }
    
    return sheet;
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    return null;
  }
}

/**
 * Convert worksheet to JSON
 */
export function worksheetToJson(worksheet: XLSX.WorkSheet): any[] {
  try {
    console.log('Converting worksheet to JSON');
    
    // Check if there's data in the worksheet
    if (!worksheet || !worksheet['!ref']) {
      console.error('Worksheet is empty or invalid');
      return [];
    }
    
    // Log the range of data in the worksheet
    console.log(`Worksheet range: ${worksheet['!ref']}`);
    
    // Get the number of rows in the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const numRows = range.e.r - range.s.r + 1;
    console.log(`Number of rows in worksheet: ${numRows}`);
    
    // Convert to JSON with options for more reliable parsing
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 'A',       // Use column letters as keys
      defval: '',        // Default empty string for missing cells
      raw: false,        // Don't use raw values
      dateNF: 'yyyy-mm-dd', // Date format
      blankrows: false   // Skip blank rows
    });
    
    console.log(`Converted ${jsonData.length} rows to JSON`);
    
    // If no data was extracted, try another approach
    if (jsonData.length === 0 && numRows > 1) {
      console.log('Trying alternative approach for extracting data');
      // Try with different options
      const alternativeData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,      // Use row 0 as headers
        raw: true,      // Use raw values
        blankrows: false
      });
      
      // Convert array format to object format with column letters
      if (alternativeData.length > 0) {
        console.log(`Alternative approach extracted ${alternativeData.length} rows`);
        return alternativeData.map((row, rowIndex) => {
          const rowObj: Record<string, any> = {};
          if (Array.isArray(row)) {
            row.forEach((cell, colIndex) => {
              // Convert column index to letter (0 = A, 1 = B, etc.)
              const colLetter = String.fromCharCode(65 + colIndex); // A-Z for first 26 columns
              rowObj[colLetter] = cell === undefined ? '' : cell;
            });
          }
          return rowObj;
        });
      }
    }
    
    return jsonData;
  } catch (error) {
    console.error('Error converting worksheet to JSON:', error);
    return [];
  }
}

/**
 * Identify column mappings using headers and common patterns
 */
export function identifyColumnMappings(data: any[]): FieldMapping[] {
  // Skip if no data
  if (!data || data.length === 0) {
    return [];
  }
  
  // Extract headers from first row
  const headers = Object.entries(data[0]).map(([key, value]) => ({
    columnIndex: key,
    headerText: String(value).toLowerCase()
  }));
  
  // Define mapping patterns for each field
  const fieldPatterns: Record<string, string[]> = {
    name: ['name', 'wine name', 'wine', 'title', 'label'],
    producer: ['producer', 'winery', 'chateau', 'domaine', 'maker', 'vineyard'],
    vintage: ['vintage', 'year', 'vin'],
    type: ['type', 'color', 'wine type', 'style'],
    region: ['region', 'area', 'country', 'appellation', 'location'],
    subregion: ['subregion', 'sub-region', 'sub region', 'district'],
    grapeVarieties: ['grape', 'grapes', 'varieties', 'varietals', 'cepage', 'cépage'],
    quantity: ['quantity', 'qty', 'bottles', 'count', 'inventory'],
    price: ['price', 'cost', 'value'],
    purchaseDate: ['purchase date', 'bought', 'acquired', 'purchase', 'date purchased'],
    drinkingWindowStart: ['drink from', 'start', 'drinking window start', 'begin drinking'],
    drinkingWindowEnd: ['drink until', 'end', 'drinking window end', 'drink by'],
    storageLocation: ['location', 'cellar', 'storage', 'rack', 'bin', 'stored'],
    notes: ['notes', 'comments', 'description', 'info', 'additional']
  };
  
  // Identify mappings
  const mappings: FieldMapping[] = [];
  
  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    // Find best match among headers
    const matches = headers.map(header => {
      const headerText = header.headerText.toLowerCase().trim();
      const bestPatternMatch = patterns.find(pattern => 
        headerText === pattern || 
        headerText.includes(pattern) || 
        headerText.replace(/[^a-z0-9]/g, '') === pattern.replace(/[^a-z0-9]/g, '')
      );
      
      let confidence = ConfidenceLevel.LOW;
      
      if (bestPatternMatch) {
        if (headerText === bestPatternMatch) {
          confidence = ConfidenceLevel.HIGH;
        } else if (headerText.includes(bestPatternMatch)) {
          confidence = ConfidenceLevel.MEDIUM;
        }
      }
      
      return {
        columnIndex: header.columnIndex,
        headerText,
        pattern: bestPatternMatch,
        confidence
      };
    }).filter(match => match.pattern);
    
    // Sort by confidence
    matches.sort((a, b) => {
      const confidenceOrder = {
        [ConfidenceLevel.HIGH]: 3,
        [ConfidenceLevel.MEDIUM]: 2,
        [ConfidenceLevel.LOW]: 1
      };
      
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      mappings.push({
        field,
        columnHeader: bestMatch.headerText,
        columnIndex: Number(bestMatch.columnIndex),
        confidence: bestMatch.confidence
      });
    }
  }
  
  return mappings;
}

/**
 * Process a batch of rows from the spreadsheet
 */
export async function processBatch(
  data: any[],
  startRow: number = 0,
  batchSize: number = 100,
  fieldMappings: FieldMapping[] = [],
  existingWines: Wine[] = [],
  options: {
    userId: number,
    useAiDrinkingWindows: boolean
  }
): Promise<BatchProcessResult> {
  const result: BatchProcessResult = {
    processedWines: [],
    fieldMappings,
    totalRows: data.length,
    processedRows: 0,
    newLocations: [],
    potentialDuplicatesCount: 0,
    needsVerificationCount: 0,
    highConfidenceCount: 0
  };
  
  // Track new storage locations
  const newStorageLocations = new Set<string>();
  
  // Process each row in the batch
  for (let i = startRow; i < Math.min(startRow + batchSize, data.length); i++) {
    const rowIndex = i;
    const row = data[rowIndex];
    
    // Skip header row or empty rows
    if (rowIndex === 0 || Object.values(row).every(val => !val)) {
      continue;
    }
    
    // Map fields based on field mappings
    let mappedData: Partial<InsertWine> = {
      userId: options.userId
    };
    
    let overallConfidence = ConfidenceLevel.HIGH;
    const missingRequiredFields: string[] = [];
    let storageLocation: string | undefined;
    
    // Populate mappedData based on fieldMappings
    for (const mapping of fieldMappings) {
      const value = row[mapping.columnIndex];
      
      if (!value) continue;
      
      // Special handling for different field types
      switch (mapping.field) {
        case 'vintage':
          const yearMatch = String(value).match(/(?:19|20)\d{2}/);
          if (yearMatch) {
            mappedData.vintage = parseInt(yearMatch[0]);
          } else if (value.toString().toLowerCase() === 'nv' || value.toString().toLowerCase() === 'non-vintage') {
            mappedData.vintage = 0; // Use 0 to represent non-vintage
          } else {
            const parsedYear = parseInt(value);
            if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= new Date().getFullYear()) {
              mappedData.vintage = parsedYear;
            } else {
              overallConfidence = ConfidenceLevel.LOW;
            }
          }
          break;
          
        case 'type':
          const typeValue = String(value).toLowerCase();
          if (typeValue.includes('red')) {
            mappedData.type = 'Red';
          } else if (typeValue.includes('white')) {
            mappedData.type = 'White';
          } else if (typeValue.includes('rosé') || typeValue.includes('rose')) {
            mappedData.type = 'Rosé';
          } else if (typeValue.includes('sparkling') || typeValue.includes('champagne') || typeValue.includes('prosecco')) {
            mappedData.type = 'Sparkling';
          } else if (typeValue.includes('dessert') || typeValue.includes('port') || typeValue.includes('sweet')) {
            mappedData.type = 'Dessert';
          } else {
            mappedData.type = String(value);
            if (mapping.confidence !== ConfidenceLevel.HIGH) {
              overallConfidence = ConfidenceLevel.MEDIUM;
            }
          }
          break;
          
        case 'quantity':
          const qty = parseInt(value);
          mappedData.quantity = !isNaN(qty) && qty > 0 ? qty : 1;
          break;
          
        case 'price':
        case 'purchasePrice':
          const price = parseFloat(String(value).replace(/[$£€,]/g, ''));
          if (!isNaN(price)) {
            mappedData.purchasePrice = price;
          }
          break;
          
        case 'purchaseDate':
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              mappedData.purchaseDate = date.toISOString();
            }
          } catch (e) {
            // Unable to parse date, skip
          }
          break;
          
        case 'drinkingWindowStart':
          try {
            // Try to extract year for drinking window start
            const yearMatch = String(value).match(/(?:19|20)\d{2}/);
            if (yearMatch) {
              const year = parseInt(yearMatch[0]);
              const date = new Date(year, 0, 1);
              mappedData.drinkingWindowStart = date.toISOString();
            } else {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                mappedData.drinkingWindowStart = date.toISOString();
              }
            }
          } catch (e) {
            // Unable to parse date, skip
          }
          break;
          
        case 'drinkingWindowEnd':
          try {
            // Try to extract year for drinking window end
            const yearMatch = String(value).match(/(?:19|20)\d{2}/);
            if (yearMatch) {
              const year = parseInt(yearMatch[0]);
              const date = new Date(year, 11, 31);
              mappedData.drinkingWindowEnd = date.toISOString();
            } else {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                mappedData.drinkingWindowEnd = date.toISOString();
              }
            }
          } catch (e) {
            // Unable to parse date, skip
          }
          break;
          
        case 'storageLocation':
          storageLocation = String(value).trim();
          if (storageLocation && !storageLocation.toLowerCase().includes('unknown')) {
            // Track new location
            newStorageLocations.add(storageLocation);
          }
          break;
          
        default:
          // For other string fields, just store as is
          if (mapping.field in mappedData) {
            mappedData[mapping.field as keyof InsertWine] = value;
          }
      }
    }
    
    // Attempt to intelligently extract producer and wine name
    // Sometimes the entire wine name might be in a single field with both producer and name
    if (mappedData.producer && !mappedData.name) {
      const producerValue = String(mappedData.producer);
      
      // Look for common patterns like "2018 Producer Wine Name"
      // Add special handling for state abbreviations like "CA" in the name
      const stateAbbreviations = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

      // First check if there's a state abbreviation in the value that should be extracted
      const statePattern = new RegExp(`^((?:19|20)\\d{2})\\s+(${stateAbbreviations.join('|')})\\s+(.+)$`);
      const stateMatch = producerValue.match(statePattern);
      
      if (stateMatch) {
        // Extract vintage, state abbreviation (as region), and remaining part
        const [_, vintage, stateAbbr, remainingName] = stateMatch;
        mappedData.vintage = parseInt(vintage);
        mappedData.region = stateAbbr;
        
        // Now parse the remaining part to extract producer and name
        const remainingParts = remainingName.split(/\s+(?=[A-Z][a-z]+|[A-Z]{2,})/, 2);
        if (remainingParts.length > 1) {
          mappedData.producer = remainingParts[0].trim();
          mappedData.name = remainingParts[1].trim();
        } else {
          mappedData.name = remainingName.trim();
        }
      } else {
        // Use the original pattern for cases without state abbreviations
        const fullNamePattern = /^((?:19|20)\d{2})\s+([A-Za-z\u00C0-\u00FF\s'&]+?)(?:\s+)(.+)$/;
        const match = producerValue.match(fullNamePattern);
        
        if (match) {
          // Extract vintage, producer and name
          const [_, vintage, producer, name] = match;
          mappedData.vintage = parseInt(vintage);
          mappedData.producer = producer.trim();
          mappedData.name = name.trim();
        } else {
          // Check for known multi-word producers first
          const knownProducers = [
            "Casa Lapostolle",
            "Domaine Serene",
            "Chateau Margaux",
            "Silver Oak",
            "Opus One",
            "Stag's Leap",
            "Penfolds Grange",
            "Caymus Vineyards"
          ];
          
          // Check for known multi-word producers
          const matchedProducer = knownProducers.find(producer => 
            producerValue.toLowerCase().includes(producer.toLowerCase())
          );
          
          if (matchedProducer) {
            // Split the name using the known producer
            const regex = new RegExp(`^(.*?${matchedProducer})\\s+(.+)$`, 'i');
            const match = producerValue.match(regex);
            
            if (match) {
              const [_, producer, name] = match;
              mappedData.producer = producer.trim();
              mappedData.name = name.trim();
            }
          } else {
            // Try to extract just producer and name (no vintage)
            // Look for patterns like "Producer Wine Name" where we can split on the first occurrence of key words
            const keyWords = [
              'Cabernet', 'Chardonnay', 'Pinot', 'Merlot', 'Sauvignon', 'Syrah', 'Riesling', 
              'Vineyard', 'Cuvée', 'Estate', 'Reserve', 'Grand', 'Cru', 'Premier', 'Clos', 
              'Château', 'Red', 'White', 'Rosé', 'Blend', 'Special', 'Limited', 'Selection',
              'Le', 'La', 'Les', 'De', 'The'
            ];
            
            // Create a regex with all key words as alternatives
            const keyWordsPattern = keyWords.join('|');
            const producerNameSplit = producerValue.match(
              new RegExp(`^([A-Za-z\\u00C0-\\u00FF\\s'&]+?)(?:\\s+)((?:${keyWordsPattern}).+)$`, 'i')
            );
            
            if (producerNameSplit) {
              const [_, producer, name] = producerNameSplit;
              mappedData.producer = producer.trim();
              mappedData.name = name.trim();
            }
            
            // If the producerValue starts with "Casa" or similar and no name was extracted, try again
            // These are commonly confused in spreadsheet imports
            if (!mappedData.name && (
              producerValue.startsWith('Casa') || 
              producerValue.startsWith('Domaine') || 
              producerValue.startsWith('Chateau') ||
              producerValue.startsWith('Dominio') ||
              producerValue.startsWith('Vina') ||
              producerValue.startsWith('Bodega')
            )) {
              // Find the first space after the second word
              const words = producerValue.split(' ');
              if (words.length > 3) {
                const producerPart = words.slice(0, 2).join(' ');
                const namePart = words.slice(2).join(' ');
                mappedData.producer = producerPart.trim();
                mappedData.name = namePart.trim();
              }
            }
          }
        }
      }
    }
    
    // For the Casa Lapostolle example and similar cases
    // If name contains both producer and wine name, extract correctly
    if (mappedData.name && !mappedData.producer) {
      const nameValue = String(mappedData.name);
      
      // Look for known multi-word producers first
      const knownProducers = [
        "Casa Lapostolle",
        "Domaine Serene",
        "Chateau Margaux",
        "Silver Oak",
        "Opus One",
        "Stag's Leap",
        "Penfolds Grange",
        "Caymus Vineyards"
      ];
      
      // Check for known multi-word producers
      const matchedProducer = knownProducers.find(producer => 
        nameValue.toLowerCase().includes(producer.toLowerCase())
      );
      
      if (matchedProducer) {
        // Split the name using the known producer
        const regex = new RegExp(`^(.*?${matchedProducer})\\s+(.+)$`, 'i');
        const match = nameValue.match(regex);
        
        if (match) {
          const [_, producer, name] = match;
          mappedData.producer = producer.trim();
          mappedData.name = name.trim();
        }
      } else {
        // Look for a pattern like "Casa Lapostolle Le Petit Clos Apalta"
        // Common producers are typically 1-3 words
        const producerNamePattern = /^([A-Za-z\u00C0-\u00FF\s'&]{2,30}?)(?:\s+)([A-Za-z\u00C0-\u00FF\s'&]{3,})$/;
        const match = nameValue.match(producerNamePattern);
        
        if (match) {
          const [_, producer, name] = match;
          mappedData.producer = producer.trim();
          mappedData.name = name.trim();
        }
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
          const content = result.content[0];
          if ('text' in content) {
            const recommendation = JSON.parse(content.text);
          
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
          }
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
    startRow?: number,
    batchSize?: number,
    fieldMappings?: FieldMapping[],
    useAiDrinkingWindows: boolean,
    useAiColumnMapping?: boolean
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
    
    // Get existing wines for duplicate detection
    const existingWines = await storage.getWinesByUserId(options.userId);
    
    // Process batch
    // Set default values if not provided
    const startRow = options.startRow || 0;
    const batchSize = options.batchSize || 100;
    
    // If no field mappings provided, generate them
    let fieldMappings = options.fieldMappings || [];
    
    if (fieldMappings.length === 0) {
      console.log('No field mappings provided, attempting to identify columns');
      
      // Try AI-based column identification if requested
      if (options.useAiColumnMapping) {
        console.log('Using AI to identify spreadsheet columns');
        
        try {
          // Extract headers from first row
          const headers = Object.values(data[0]).map(value => String(value));
          
          // Get sample rows for context (up to 3)
          const sampleRows = data.slice(1, 4);
          
          // Use Claude to identify columns
          const aiMappings = await identifySpreadsheetColumns(headers, sampleRows);
          
          if (aiMappings && aiMappings.length > 0) {
            console.log('AI successfully identified column mappings:', aiMappings);
            
            // Convert AI mappings to our FieldMapping format
            fieldMappings = aiMappings.map(mapping => ({
              field: mapping.field,
              columnHeader: mapping.columnHeader,
              columnIndex: Object.entries(data[0]).find(
                ([_, value]) => String(value).toLowerCase() === mapping.columnHeader.toLowerCase()
              )?.[0] as unknown as number || 0,
              confidence: mapping.confidence as ConfidenceLevel
            }));
          } else {
            console.log('AI failed to identify columns, falling back to rule-based approach');
            fieldMappings = identifyColumnMappings(data);
          }
        } catch (aiError) {
          console.error('Error using AI for column identification:', aiError);
          fieldMappings = identifyColumnMappings(data);
        }
      } else {
        // Use rule-based approach
        fieldMappings = identifyColumnMappings(data);
      }
    }
    
    console.log('Processing batch with', data.length, 'rows from Excel/CSV file');
    console.log('Field mappings:', fieldMappings);
    
    const batchResult = await processBatch(
      data,
      startRow,
      batchSize,
      fieldMappings,
      existingWines,
      {
        userId: options.userId,
        useAiDrinkingWindows: options.useAiDrinkingWindows
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
      // TODO: Add locations once we have the table
      // For now, we'll just track them
      console.log(`Would create location: ${location}`);
    }));
  }
  
  // Process each wine
  for (const wine of processedWines) {
    // Skip duplicates if not importing them
    if (wine.isPotentialDuplicate && !options.importDuplicates) {
      result.skipped++;
      continue;
    }
    
    try {
      // Prepare wine data
      const wineData = {
        ...wine.mappedData,
        userId: options.userId,
        createdAt: new Date().toISOString()
      };
      
      // Apply AI drinking window recommendation if requested
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
