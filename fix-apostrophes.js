const fs = require('fs').promises;
const glob = require('fast-glob');

async function fixApostrophes() {
  try {
    const files = await glob('src/app/**/page.tsx', {
      absolute: true,
      cwd: '/home/mate/Dev/NextProjects/doshi-sensei'
    });
    
    console.log(`Fixing apostrophes in ${files.length} files...\n`);
    
    let fixedCount = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check if file has the problematic pattern
      if (content.includes("Dōshi Sensei's")) {
        // Replace the apostrophe in the description
        const fixed = content.replace(
          /description: '(.*)Dōshi Sensei's(.*)'/g,
          "description: '$1Dōshi Sensei\\'s$2'"
        );
        
        await fs.writeFile(file, fixed);
        console.log(`Fixed: ${file}`);
        fixedCount++;
      }
    }
    
    console.log(`\n✓ Fixed ${fixedCount} files`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixApostrophes();