const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

console.log('Posts directory:', POSTS_DIR);
console.log('Directory exists?', fs.existsSync(POSTS_DIR));

if (fs.existsSync(POSTS_DIR)) {
  const files = fs.readdirSync(POSTS_DIR);
  console.log('Files found:', files);
  
  files.filter(f => f.endsWith('.mdx')).forEach(file => {
    const fullPath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    console.log('\nFile:', file);
    console.log('First 200 chars:', content.substring(0, 200));
  });
}