import XLSX from 'xlsx';
import fs from 'fs';

try {
  console.log('Analyzing LWIN database structure...');
  
  const workbook = XLSX.readFile('attached_assets/LWINdatabase.xlsx');
  console.log('Available sheets:', workbook.SheetNames);
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get just the first few rows to understand structure
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log('Sheet range:', range);
  
  // Get headers (first row)
  const headers = [];
  for (let col = range.s.c; col <= Math.min(range.e.c, 20); col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    if (cell && cell.v) {
      headers.push(cell.v);
    }
  }
  
  console.log('Headers:', headers);
  console.log('Total rows estimate:', range.e.r + 1);
  
  // Get a sample row
  const sampleRow = [];
  for (let col = range.s.c; col <= Math.min(range.e.c, 20); col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
    const cell = worksheet[cellAddress];
    sampleRow.push(cell ? cell.v : null);
  }
  
  console.log('Sample row:', sampleRow);
  
} catch (error) {
  console.error('Error analyzing LWIN database:', error.message);
}