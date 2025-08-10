const fs = require('fs');
const path = require('path');

// List of pages that need fixing (client components with metadata)
const pagesToFix = [
  'achievements-test',
  'admin',
  'contact',
  'diagnose-articles',
  'offline',
  'popular-videos',
  'read',
  'reset-password',
  'test-ai-explanation',
  'test-audio',
  'test-cache',
  'test-eviction',
  'test-kana-audio',
  'test-shadowing',
  'test-simple-ai',
  'test-minimal-ai',
  'test-three-pillar-integration',
  'verify-email'
];

const adminPages = [
  'admin/activities',
  'admin/analytics',
  'admin/articles',
  'admin/debug',
  'admin/features',
  'admin/logs',
  'admin/kpi-dashboard',
  'admin/mood-boards',
  'admin/resources',
  'admin/snake-path',
  'admin/stories',
  'admin/user-entitlements',
  'admin/users',
  'admin/achievements',
  'admin/achievements/analytics',
  'admin/analytics/behavior',
  'admin/analytics/content',
  'admin/analytics/conversions',
  'admin/analytics/features',
  'admin/mood-boards/new',
  'admin/resources/new',
  'admin/stories/generate',
  'admin/stories/new'
];

const gamePages = [
  'games/kanji-simon',
  'games/reading-routes',
  'games/stroke-order-practice'
];

const practicePages = [
  'practice/conjugation',
  'practice/hiragana',
  'practice/kana',
  'practice/katakana',
  'practice/snake-adjust',
  'practice/snake-demo'
];

const drillPages = [
  'drill/conjugation',
  'drill/flashcards'
];

const toolPages = [
  'tools/my-videos',
  'tools/textbook-vocabulary',
  'tools/youtube-shadowing'
];

const settingsPages = [
  'settings/acknowledgments',
  'settings/terms-of-service',
  'settings/privacy-policy'
];

const allPages = [
  ...pagesToFix,
  ...adminPages,
  ...gamePages,
  ...practicePages,
  ...drillPages,
  ...toolPages,
  ...settingsPages,
  'auth/action'
];

function getPageTitle(pagePath) {
  const parts = pagePath.split('/');
  const pageName = parts[parts.length - 1];
  
  // Special cases
  const titleMap = {
    'achievements-test': 'Achievements Test',
    'diagnose-articles': 'Diagnose Articles',
    'popular-videos': 'Popular Videos',
    'reset-password': 'Reset Password',
    'test-ai-explanation': 'AI Explanation Test',
    'test-audio': 'Audio Test',
    'test-cache': 'Cache Test',
    'test-eviction': 'Eviction Test',
    'test-kana-audio': 'Kana Audio Test',
    'test-shadowing': 'Shadowing Test',
    'test-simple-ai': 'Simple AI Test',
    'test-minimal-ai': 'Minimal AI Test',
    'test-three-pillar-integration': 'Three Pillar Integration Test',
    'verify-email': 'Verify Email',
    'my-videos': 'My Videos',
    'textbook-vocabulary': 'Textbook Vocabulary',
    'youtube-shadowing': 'YouTube Shadowing',
    'terms-of-service': 'Terms of Service',
    'privacy-policy': 'Privacy Policy',
    'kanji-simon': 'Kanji Simon',
    'reading-routes': 'Reading Routes',
    'stroke-order-practice': 'Stroke Order Practice',
    'snake-adjust': 'Snake Adjust',
    'snake-demo': 'Snake Demo',
    'user-entitlements': 'User Entitlements',
    'kpi-dashboard': 'KPI Dashboard',
    'mood-boards': 'Mood Boards'
  };
  
  return titleMap[pageName] || 
    pageName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getPageDescription(pagePath, title) {
  // Special descriptions for key pages
  const descMap = {
    'popular-videos': 'Browse the most popular Japanese YouTube videos for shadowing practice. Learn from content loved by the community.',
    'youtube-shadowing': 'Practice Japanese pronunciation with YouTube video shadowing. Extract transcripts and practice speaking along with native speakers.',
    'textbook-vocabulary': 'Study vocabulary from popular Japanese textbooks including Genki and Minna no Nihongo with spaced repetition.',
    'my-videos': 'Access your saved YouTube videos and practice history for Japanese shadowing exercises.',
    'hiragana': 'Master hiragana characters with interactive practice exercises and mnemonics.',
    'katakana': 'Learn katakana characters through engaging practice drills and memory aids.',
    'conjugation': 'Practice Japanese verb and adjective conjugations with comprehensive exercises.',
    'kanji-simon': 'Test your kanji memory with this fun Simon Says-style memory game.',
    'stroke-order-practice': 'Learn proper kanji stroke order with interactive drawing exercises.'
  };
  
  const pageName = pagePath.split('/').pop();
  return descMap[pageName] || `${title} - Part of Doshi Sensei's comprehensive Japanese learning platform.`;
}

function processPage(pagePath) {
  const srcPath = path.join(__dirname, '..', 'src', 'app', pagePath, 'page.tsx');
  
  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  Skipping ${pagePath} - file not found`);
    return;
  }
  
  const content = fs.readFileSync(srcPath, 'utf8');
  
  // Check if it's a client component with metadata
  if (!content.includes("'use client'") || !content.includes('export const metadata')) {
    console.log(`⚠️  Skipping ${pagePath} - not a client component with metadata`);
    return;
  }
  
  console.log(`✅ Processing ${pagePath}...`);
  
  // Extract the component name
  const componentMatch = content.match(/export default function (\w+)\(/);
  if (!componentMatch) {
    console.log(`⚠️  Could not find component name in ${pagePath}`);
    return;
  }
  
  const originalComponentName = componentMatch[1];
  const clientComponentName = originalComponentName.replace('Page', 'Client');
  
  // Remove metadata from content
  const cleanedContent = content
    .replace(/export const metadata = \{[\s\S]*?\n\};\n\n/, '')
    .replace(`export default function ${originalComponentName}(`, `export default function ${clientComponentName}(`);
  
  // Save as client component
  const clientPath = path.join(path.dirname(srcPath), `${clientComponentName}.tsx`);
  fs.writeFileSync(clientPath, cleanedContent);
  
  // Generate page title and description
  const title = getPageTitle(pagePath);
  const description = getPageDescription(pagePath, title);
  
  // Determine if page should be indexed
  const noIndex = pagePath.includes('test') || 
                  pagePath.includes('admin') || 
                  pagePath.includes('auth') ||
                  pagePath.includes('reset-password') ||
                  pagePath.includes('verify-email');
  
  // Create new server component
  const serverComponent = `import { Metadata } from 'next';
import ${clientComponentName} from './${clientComponentName}';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: '${title} | Doshi Sensei',
  description: '${description}',
  openGraph: {
    title: '${title} | Doshi Sensei',
    description: '${description}',
    type: 'website',
    url: 'https://doshisensei.com/${pagePath}',
  },
  twitter: {
    card: 'summary',
    title: '${title} | Doshi Sensei',
    description: '${description}',
  },${noIndex ? `
  robots: {
    index: false,
    follow: true,
  },` : ''}
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${title} - Doshi Sensei",
  "description": "${description}",
  "url": "https://doshisensei.com/${pagePath}",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ${originalComponentName}() {
  return (
    <>
      <StructuredData data={structuredData} />
      <${clientComponentName} />
    </>
  );
}`;

  fs.writeFileSync(srcPath, serverComponent);
  console.log(`✅ Fixed ${pagePath}`);
}

// Process all pages
console.log('🚀 Starting metadata fix...\n');
allPages.forEach(processPage);
console.log('\n✨ Metadata fix complete!');