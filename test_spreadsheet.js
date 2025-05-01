// Test script to verify spreadsheet processing
const fs = require('fs');
const { processSpreadsheetFile } = require('./server/spreadsheet');

async function testProcessing() {
  try {
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
