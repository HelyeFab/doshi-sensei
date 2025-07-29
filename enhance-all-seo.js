const fs = require('fs').promises;
const path = require('path');
const glob = require('fast-glob');

// Page-specific SEO configurations
const pageConfigs = {
  '/': {
    title: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
    description: 'Master Japanese with our all-in-one platform: verb conjugations, JLPT kanji study, themed kanji mood boards, Jisho/WaniKani vocabulary integration, Anki deck imports, YouTube shadowing practice, news reading with furigana, AI-generated stories, interactive games, comprehensive grammar resources, and so much more. Your complete toolkit for Japanese fluency.',
    keywords: [
      'Japanese learning platform',
      'Japanese verb conjugation',
      'JLPT kanji study',
      'kanji mood boards',
      'Jisho vocabulary',
      'WaniKani integration',
      'Anki deck import',
      'Japanese flashcards',
      'YouTube shadowing practice',
      'Japanese news reading',
      'AI Japanese stories',
      'Japanese learning games',
      'Japanese grammar resources',
      'hiragana katakana practice',
      'spaced repetition Japanese',
      'comprehensive Japanese study',
      'Japanese language app',
      'learn Japanese online',
      'Japanese drill practice',
      'Japanese vocabulary builder'
    ],
    structuredData: ['website', 'organization', 'educationalApp']
  },
  '/vocabulary': {
    title: 'Japanese Vocabulary Builder - Jisho & WaniKani Integration',
    description: 'Build your Japanese vocabulary with our powerful search engine integrating Jisho and WaniKani databases. Search kanji, words, and phrases with detailed meanings, readings, pitch accent, example sentences, and save to custom study lists. Import Anki decks and practice with spaced repetition flashcards.',
    keywords: ['Japanese vocabulary', 'Jisho integration', 'WaniKani vocabulary', 'Japanese dictionary', 'kanji search', 'Japanese word lookup', 'pitch accent', 'example sentences', 'JLPT vocabulary', 'Anki import', 'Japanese flashcards'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Vocabulary', url: '/vocabulary' }]
  },
  '/practice': {
    title: 'Japanese Practice Exercises',
    description: 'Practice Japanese with interactive exercises. Master hiragana, katakana, kanji, and verb conjugations through engaging drills and games.',
    keywords: ['Japanese practice', 'Japanese exercises', 'hiragana practice', 'katakana practice', 'kanji practice', 'conjugation drills'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Practice', url: '/practice' }]
  },
  '/games': {
    title: 'Japanese Learning Games',
    description: 'Learn Japanese through fun and interactive games. Practice kanji recognition, vocabulary, and grammar in an engaging way.',
    keywords: ['Japanese games', 'learning games', 'kanji games', 'vocabulary games', 'educational games', 'Japanese study games'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Games', url: '/games' }]
  },
  '/news': {
    title: 'Japanese News Reader',
    description: 'Read Japanese news articles with furigana support, vocabulary lookup, and grammar explanations. Perfect for improving reading comprehension.',
    keywords: ['Japanese news', 'Japanese reading', 'NHK news', 'Japanese articles', 'reading practice', 'Japanese comprehension'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'News', url: '/news' }]
  },
  '/stories': {
    title: 'Japanese Stories & Reading',
    description: 'Read engaging Japanese stories adapted to your level. Practice reading comprehension with AI-generated stories and classic tales.',
    keywords: ['Japanese stories', 'Japanese reading', 'graded readers', 'Japanese tales', 'reading practice', 'Japanese literature'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Stories', url: '/stories' }]
  },
  '/kanji-browser': {
    title: 'Kanji Browser & Dictionary',
    description: 'Browse and search kanji by JLPT level, grade, or radical. View stroke order, meanings, readings, and example words.',
    keywords: ['kanji browser', 'kanji dictionary', 'JLPT kanji', 'kanji search', 'stroke order', 'kanji meanings'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Kanji Browser', url: '/kanji-browser' }]
  },
  '/drill': {
    title: 'Japanese Drill Practice',
    description: 'Master Japanese through focused drill exercises. Practice conjugations, vocabulary, and grammar with spaced repetition.',
    keywords: ['Japanese drills', 'conjugation practice', 'vocabulary drills', 'spaced repetition', 'Japanese exercises'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Drills', url: '/drill' }]
  },
  '/tools/youtube-shadowing': {
    title: 'YouTube Shadowing Practice',
    description: 'Practice Japanese shadowing with YouTube videos. Extract audio, get transcripts, and improve your pronunciation and listening skills.',
    keywords: ['Japanese shadowing', 'YouTube practice', 'pronunciation practice', 'listening practice', 'Japanese audio'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Tools', url: '/tools' }, { name: 'YouTube Shadowing', url: '/tools/youtube-shadowing' }]
  },
  '/tools/textbook-vocabulary': {
    title: 'Textbook Vocabulary - Genki & Minna no Nihongo',
    description: 'Study vocabulary from popular Japanese textbooks including Genki and Minna no Nihongo with spaced repetition and interactive flashcards.',
    keywords: ['Genki vocabulary', 'Minna no Nihongo', 'textbook vocabulary', 'Japanese textbooks', 'JLPT vocabulary'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Tools', url: '/tools' }, { name: 'Textbook Vocabulary', url: '/tools/textbook-vocabulary' }]
  },
  '/settings': {
    title: 'Settings',
    description: 'Manage your Doshi Sensei settings and preferences',
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Settings', url: '/settings' }]
  },
  '/account': {
    title: 'My Account',
    description: 'Manage your Doshi Sensei account, subscription, and profile',
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Account', url: '/account' }]
  }
};

// Default configuration for pages not in the map
function getDefaultConfig(filePath) {
  const dirName = path.basename(path.dirname(filePath));
  const pageName = dirName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return {
    title: pageName,
    description: `${pageName} - Learn Japanese with Doshi Sensei`,
    breadcrumb: [{ name: 'Home', url: '/' }, { name: pageName, url: `/${dirName}` }]
  };
}

async function updatePageWithEnhancedSEO(pageFile) {
  try {
    const content = await fs.readFile(pageFile, 'utf8');
    
    // Skip if already enhanced (has generatePageMetadata)
    if (content.includes('generatePageMetadata')) {
      console.log(`Skipping ${pageFile} - already enhanced`);
      return false;
    }
    
    // Extract current component name
    const importMatch = content.match(/import (\w+) from '\.\/\w+'/);
    if (!importMatch) {
      console.log(`Skipping ${pageFile} - no component import found`);
      return false;
    }
    
    const componentName = importMatch[1];
    
    // Determine the route path
    const relativePath = path.relative('/home/mate/Dev/NextProjects/doshi-sensei/src/app', pageFile);
    const routePath = '/' + path.dirname(relativePath).replace(/\\/g, '/');
    const cleanPath = routePath.replace(/\/page\.tsx$/, '').replace(/\/$/, '') || '/';
    
    // Get SEO config for this page
    const config = pageConfigs[cleanPath] || getDefaultConfig(pageFile);
    
    // Build the new content
    let newContent = `import type { Metadata } from 'next';
import ${componentName} from './${componentName}';
import { generatePageMetadata, structuredData } from '@/utils/seo';
import { StructuredData } from '@/components/StructuredData';

export const metadata: Metadata = generatePageMetadata({
  title: '${config.title}',
  description: '${config.description}',`;

    if (config.keywords) {
      newContent += `\n  keywords: ${JSON.stringify(config.keywords, null, 2).split('\n').join('\n  ')},`;
    }

    newContent += `\n  path: '${cleanPath}',
});

export default function Page() {`;

    // Add structured data components
    const structuredDataComponents = [];
    
    if (config.structuredData) {
      config.structuredData.forEach(type => {
        structuredDataComponents.push(`      <StructuredData data={structuredData.${type}} />`);
      });
    }
    
    if (config.breadcrumb) {
      newContent += `\n  const breadcrumbData = structuredData.breadcrumb(${JSON.stringify(config.breadcrumb, null, 2).split('\n').join('\n  ')});`;
      structuredDataComponents.push(`      <StructuredData data={breadcrumbData} />`);
    }
    
    if (structuredDataComponents.length > 0) {
      newContent += `\n\n  return (
    <>
${structuredDataComponents.join('\n')}
      <${componentName} />
    </>
  );`;
    } else {
      newContent += `\n  return <${componentName} />;`;
    }
    
    newContent += '\n}\n';
    
    // Write the updated content
    await fs.writeFile(pageFile, newContent);
    console.log(`Enhanced: ${cleanPath}`);
    return true;
    
  } catch (error) {
    console.error(`Error updating ${pageFile}:`, error.message);
    return false;
  }
}

async function enhanceAllPages() {
  try {
    const pageFiles = await glob('src/app/**/page.tsx', {
      absolute: true,
      cwd: '/home/mate/Dev/NextProjects/doshi-sensei'
    });
    
    console.log(`Found ${pageFiles.length} page files to process\n`);
    
    let enhancedCount = 0;
    let skippedCount = 0;
    
    // Process pages in batches to avoid overwhelming the system
    for (const pageFile of pageFiles) {
      const result = await updatePageWithEnhancedSEO(pageFile);
      if (result) {
        enhancedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`- Enhanced: ${enhancedCount} pages`);
    console.log(`- Skipped: ${skippedCount} pages`);
    
  } catch (error) {
    console.error('Error enhancing pages:', error);
  }
}

enhanceAllPages();