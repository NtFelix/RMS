const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'app/modern/components');

// List of files to process with their specific import paths to update
const filesToUpdate = [
  {
    file: 'services.tsx',
    imports: [
      { from: '../../components/ui/button', to: '../../../components/ui/button' }
    ]
  },
  {
    file: 'testimonials.tsx',
    imports: [
      { from: '../../components/ui/card', to: '../../../components/ui/card' }
    ]
  },
  {
    file: 'cta.tsx',
    imports: [
      { from: '../../components/ui/button', to: '../../../components/ui/button' }
    ]
  },
  {
    file: 'navigation.tsx',
    imports: [
      { from: '../../components/ui/button', to: '../../../components/ui/button' }
    ]
  }
];

filesToUpdate.forEach(({ file, imports }) => {
  const filePath = path.join(componentsDir, file);
  
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update each import path
    imports.forEach(({ from, to }) => {
      const regex = new RegExp(`from ["']${from.replace(/\//g, '\\/')}["']`, 'g');
      content = content.replace(regex, `from '${to}'`);
    });
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('All relative imports have been updated.');
