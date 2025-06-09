const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'app/modern/components');

// List of files to process
const files = [
  'hero.tsx',
  'features.tsx',
  'services.tsx',
  'testimonials.tsx',
  'cta.tsx',
  'footer.tsx',
  'navigation.tsx'
];

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the import paths to use @/components/ui/ instead of relative paths
    const updatedContent = content.replace(
      /'\..\/\..\/components\/ui\/([^']+)'/g, 
      (match, component) => `'@/components/ui/${component}'
    `);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated imports in ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Import path updates completed.');
