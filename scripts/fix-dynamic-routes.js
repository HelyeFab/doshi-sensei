const fs = require('fs');
const path = require('path');

// List of dynamic route pages that need fixing
const dynamicRoutes = [
  'admin/resources/[id]/edit/page.tsx',
  'admin/stories/edit/[id]/page.tsx',
  'admin/mood-boards/[id]/edit/page.tsx',
  'games/kanji-simon/[boardId]/page.tsx',
  'games/reading-routes/[boardId]/page.tsx',
  'kanji-moods/[boardId]/page.tsx',
  'news/[id]/page.tsx',
  'resources/[slug]/page.tsx',
  'stories/[slug]/page.tsx'
];

function fixDynamicRoute(filePath) {
  const fullPath = path.join(__dirname, '..', 'src', 'app', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if it's a client component with metadata
  if (!content.includes("'use client'") || !content.includes('export const metadata')) {
    console.log(`✓ ${filePath} is already correctly structured`);
    return;
  }
  
  console.log(`🔧 Fixing ${filePath}...`);
  
  // Remove 'use client' and extract component content
  let cleanedContent = content.replace(/^'use client';\s*\n/, '');
  
  // Extract the default export function name
  const componentMatch = cleanedContent.match(/export default function (\w+)/);
  if (!componentMatch) {
    console.log(`⚠️  Could not find component name in ${filePath}`);
    return;
  }
  
  const componentName = componentMatch[1];
  const clientComponentName = componentName.replace('Page', 'Client');
  
  // Extract everything except the metadata export
  const metadataMatch = cleanedContent.match(/export const metadata = \{[\s\S]*?\n\};\n/);
  if (!metadataMatch) {
    console.log(`⚠️  Could not extract metadata from ${filePath}`);
    return;
  }
  
  // Create client component content
  const clientContent = "'use client';\n\n" + cleanedContent
    .replace(metadataMatch[0], '')
    .replace(`export default function ${componentName}`, `export default function ${clientComponentName}`);
  
  // Save client component
  const clientPath = fullPath.replace('.tsx', 'Client.tsx');
  fs.writeFileSync(clientPath, clientContent);
  
  // Create server component
  const serverContent = `import { Metadata } from 'next';
import ${clientComponentName} from './${clientComponentName}';

${metadataMatch[0]}
export default function ${componentName}(props: any) {
  return <${clientComponentName} {...props} />;
}`;
  
  fs.writeFileSync(fullPath, serverContent);
  console.log(`✅ Fixed ${filePath}`);
}

// Process all dynamic routes
console.log('Fixing dynamic route pages...\n');
dynamicRoutes.forEach(fixDynamicRoute);
console.log('\n✨ Done!');