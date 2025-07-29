const { optimizeSEO } = require('/home/mate/Dev/MCPs/nextjs-seo-mcp/dist/optimizer.js');
const fs = require('fs').promises;
const path = require('path');

async function run() {
  try {
    // Load the config
    const configPath = path.join('/home/mate/Dev/MCPs/nextjs-seo-mcp', 'doshi-config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    
    console.log('Running MCP optimizer on Doshi Sensei project...');
    
    const result = await optimizeSEO(
      '/home/mate/Dev/NextProjects/doshi-sensei',
      config,
      'fix'  // Use 'fix' mode to apply changes
    );
    
    console.log('\nOptimization Results:');
    console.log(`Files Modified: ${result.filesModified.length}`);
    console.log(`Files Created: ${result.filesCreated.length}`);
    console.log(`Improvements: ${result.improvements.length}`);
    console.log(`Warnings: ${result.warnings.length}`);
    
    if (result.filesModified.length > 0) {
      console.log('\nModified Files:');
      result.filesModified.forEach(file => console.log(`  - ${file}`));
    }
    
    if (result.filesCreated.length > 0) {
      console.log('\nCreated Files:');
      result.filesCreated.forEach(file => console.log(`  - ${file}`));
    }
    
    if (result.improvements.length > 0) {
      console.log('\nImprovements:');
      result.improvements.forEach(imp => console.log(`  - ${imp}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
    
    console.log('\n✅ Optimization complete!');
  } catch (error) {
    console.error('Error running optimizer:', error);
    process.exit(1);
  }
}

run();