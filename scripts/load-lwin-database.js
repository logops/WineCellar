// Script to load the LWIN database
const { loadLWINDatabase } = require('../server/lwinDatabase.ts');

async function main() {
  try {
    console.log('Starting LWIN database load...');
    await loadLWINDatabase();
    console.log('LWIN database loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to load LWIN database:', error);
    process.exit(1);
  }
}

main();