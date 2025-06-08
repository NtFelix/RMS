const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'app/modern/components');

// List of files to process
const files = [
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
    
    // Replace relative paths to UI components with the @/ alias
    const updatedContent = content.replace(
      /'\..\/\..\/components\/ui\/([^']+)'/g, 
      (match, component) => `'@/components/ui/${component}'`
    );
    
    // Also replace any other relative paths that might be using @/components
    const finalContent = updatedContent.replace(
      /'@\/components\/([^']+)'/g,
      (match, component) => `'@/components/${component}'`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log(`Updated imports in ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('All imports have been updated.');
