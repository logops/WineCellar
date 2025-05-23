import { loadLWINDatabaseChunked } from '../server/wineMatching.ts';

console.log('🍷 Loading LWIN wine database...');
console.log('This may take a few minutes for large databases.');

loadLWINDatabaseChunked()
  .then(() => {
    console.log('✅ LWIN database loaded successfully!');
    console.log('🎯 Wine matching is now available for imports.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to load LWIN database:', error);
    process.exit(1);
  });