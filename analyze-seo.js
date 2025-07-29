const { analyzeSEO } = require('/home/mate/Dev/MCPs/nextjs-seo-mcp/dist/analyzer.js');

async function runAnalysis() {
  try {
    console.log('Running SEO analysis on Doshi Sensei...\n');
    
    const result = await analyzeSEO('/home/mate/Dev/NextProjects/doshi-sensei');
    
    console.log('=== SEO Analysis Results ===\n');
    console.log(`Overall Score: ${result.score}/100\n`);
    
    // Show issues by severity
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    const warningIssues = result.issues.filter(i => i.severity === 'warning');
    const infoIssues = result.issues.filter(i => i.severity === 'info');
    
    console.log(`Issues found:`);
    console.log(`- Critical: ${criticalIssues.length}`);
    console.log(`- Warnings: ${warningIssues.length}`);
    console.log(`- Info: ${infoIssues.length}`);
    console.log(`- Total: ${result.issues.length}\n`);
    
    if (criticalIssues.length > 0) {
      console.log('Critical Issues:');
      criticalIssues.slice(0, 5).forEach(issue => {
        console.log(`  ❌ ${issue.message}`);
        if (issue.file) console.log(`     File: ${issue.file}`);
        if (issue.suggestion) console.log(`     Fix: ${issue.suggestion}`);
      });
      console.log('');
    }
    
    if (warningIssues.length > 0) {
      console.log('Top Warnings:');
      warningIssues.slice(0, 5).forEach(issue => {
        console.log(`  ⚠️  ${issue.message}`);
        if (issue.file) console.log(`     File: ${issue.file}`);
      });
      console.log('');
    }
    
    console.log('Recommendations:');
    result.recommendations.slice(0, 5).forEach(rec => {
      console.log(`  • ${rec}`);
    });
    
    // Page analysis summary
    console.log(`\nPages analyzed: ${result.pages.length}`);
    
    const pagesWithMeta = result.pages.filter(p => p.title && p.description).length;
    const pagesWithOG = result.pages.filter(p => p.hasOpenGraph).length;
    const pagesWithTwitter = result.pages.filter(p => p.hasTwitterCard).length;
    const pagesWithStructuredData = result.pages.filter(p => p.hasStructuredData).length;
    
    console.log(`\nSEO Coverage:`);
    console.log(`- Pages with meta tags: ${pagesWithMeta}/${result.pages.length}`);
    console.log(`- Pages with OpenGraph: ${pagesWithOG}/${result.pages.length}`);
    console.log(`- Pages with Twitter Cards: ${pagesWithTwitter}/${result.pages.length}`);
    console.log(`- Pages with Structured Data: ${pagesWithStructuredData}/${result.pages.length}`);
    
  } catch (error) {
    console.error('Error running SEO analysis:', error);
  }
}

runAnalysis();