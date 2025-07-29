const fs = require('fs').promises;
const path = require('path');
const glob = require('fast-glob');

async function updatePageFiles() {
  try {
    // Find all page.tsx files
    const pageFiles = await glob('src/app/**/page.tsx', {
      absolute: true,
      cwd: '/home/mate/Dev/NextProjects/doshi-sensei'
    });
    
    console.log(`Found ${pageFiles.length} page.tsx files to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const pageFile of pageFiles) {
      const dir = path.dirname(pageFile);
      const dirName = path.basename(dir);
      
      // Check if this page.tsx has 'use client' at the top
      const content = await fs.readFile(pageFile, 'utf8');
      const trimmedContent = content.trim();
      if (!trimmedContent.startsWith("'use client'") && !trimmedContent.startsWith('"use client"')) {
        console.log(`Skipping ${pageFile} - not a client component`);
        skippedCount++;
        continue;
      }
      
      // Look for a corresponding wrapper file
      const files = await fs.readdir(dir);
      const wrapperFile = files.find(f => 
        f.endsWith('.tsx') && 
        f !== 'page.tsx' && 
        f !== 'layout.tsx' &&
        !f.startsWith('use')
      );
      
      if (!wrapperFile) {
        console.log(`No wrapper found for ${pageFile}`);
        skippedCount++;
        continue;
      }
      
      const componentName = wrapperFile.replace('.tsx', '');
      
      // Generate the new server component content
      const newContent = `import type { Metadata } from 'next';
import ${componentName} from './${componentName}';

export const metadata: Metadata = {
  title: '${componentName.replace(/([A-Z])/g, ' $1').trim()} - Doshi Sensei',
  description: 'Learn Japanese with Doshi Sensei'
};

export default function Page() {
  return <${componentName} />;
}
`;
      
      // Backup the original file
      await fs.writeFile(pageFile + '.client-backup', content);
      
      // Write the new server component
      await fs.writeFile(pageFile, newContent);
      
      console.log(`Updated: ${pageFile} -> imports ${componentName}`);
      updatedCount++;
    }
    
    console.log(`\nSummary:`);
    console.log(`- Updated: ${updatedCount} files`);
    console.log(`- Skipped: ${skippedCount} files`);
    console.log(`\nBackup files created with .client-backup extension`);
    
  } catch (error) {
    console.error('Error updating page files:', error);
    process.exit(1);
  }
}

updatePageFiles();