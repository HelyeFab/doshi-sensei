const { optimizeSEO } = require('/home/mate/Dev/MCPs/nextjs-seo-mcp/dist/optimizer.js');

async function run() {
  try {
    console.log('Running MCP optimizer to complete the transformation...');
    
    const result = await optimizeSEO({
      target: '/home/mate/Dev/NextProjects/doshi-sensei/src/app/**/page.tsx'
    });
    
    console.log('\nOptimization Results:');
    console.log(`Files Modified: ${result.filesModified.length}`);
    console.log(`Files Created: ${result.filesCreated.length}`);
    
    if (result.filesModified.length > 0) {
      console.log('\nModified Files:');
      result.filesModified.forEach(file => console.log(`  - ${file}`));
    }
    
    if (result.filesCreated.length > 0) {
      console.log('\nCreated Files:');
      result.filesCreated.forEach(file => console.log(`  - ${file}`));
    }
    
    console.log('\n✅ Optimization complete!');
  } catch (error) {
    console.error('Error running optimizer:', error);
  }
}

run();