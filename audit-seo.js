const { auditSEO } = require('/home/mate/Dev/MCPs/nextjs-seo-mcp/dist/audit.js');

async function runAudit() {
  try {
    console.log('Running comprehensive SEO audit on Doshi Sensei...\n');
    
    const result = await auditSEO(
      '/home/mate/Dev/NextProjects/doshi-sensei',
      'https://doshisensei.com',
      true // detailed audit
    );
    
    console.log('=== SEO Audit Results ===\n');
    console.log(`Overall Score: ${result.overall.score}/100 (Grade: ${result.overall.grade})\n`);
    
    console.log('Technical SEO Scores:');
    Object.entries(result.technical).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}/100`);
    });
    
    console.log('\nContent Optimization Scores:');
    Object.entries(result.content).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}/100`);
    });
    
    if (result.recommendations.critical.length > 0) {
      console.log('\n🚨 Critical Recommendations:');
      result.recommendations.critical.forEach(rec => console.log(`  - ${rec}`));
    }
    
    if (result.recommendations.important.length > 0) {
      console.log('\n⚠️  Important Recommendations:');
      result.recommendations.important.slice(0, 5).forEach(rec => console.log(`  - ${rec}`));
    }
    
    if (result.recommendations.nice_to_have.length > 0) {
      console.log('\n💡 Nice to Have:');
      result.recommendations.nice_to_have.slice(0, 3).forEach(rec => console.log(`  - ${rec}`));
    }
    
  } catch (error) {
    console.error('Error running SEO audit:', error);
  }
}

runAudit();