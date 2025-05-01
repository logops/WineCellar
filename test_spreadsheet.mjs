// Test script to verify spreadsheet processing
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Set up require-like functionality 
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Use dynamic import to load the module
async function testProcessing() {
  try {
    // Load the spreadsheet processing module
    const { processSpreadsheetFile } = await import('./server/spreadsheet.js');
    
    // Read the CSV file
    const fileBuffer = fs.readFileSync('./test_import.csv');
    
    // Process the file
    const result = await processSpreadsheetFile(fileBuffer, {
      userId: 1,
      useAiDrinkingWindows: false
    });
    
    console.log('Success:', result.success);
    console.log('Field Mappings:');
    console.log(JSON.stringify(result.data.fieldMappings, null, 2));
    console.log('\nSample Data:');
    console.log(JSON.stringify(result.data.sampleData, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testProcessing();
