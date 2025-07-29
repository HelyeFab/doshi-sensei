const fs = require('fs').promises;
const path = require('path');
const glob = require('fast-glob');

// Comprehensive site description with ALL features
const FULL_SITE_DESCRIPTION = 'The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and themed mood boards, complete vocabulary sets from Genki I & II and Minna no Nihongo I & II textbooks, practice with Jisho/WaniKani integration, import Anki decks, read NHK news with furigana, enjoy AI-generated stories, practice YouTube shadowing, play interactive learning games, access comprehensive grammar resources from Japanese creators, and build fluency with our all-in-one toolkit.';

// Page-specific SEO configurations with Dōshi and comprehensive descriptions
const pageConfigs = {
  '/': {
    title: 'Dōshi Sensei - The Ultimate Japanese Learning Platform',
    description: FULL_SITE_DESCRIPTION,
    keywords: [
      'Japanese learning platform',
      'Japanese verb conjugation',
      'JLPT kanji study',
      'kanji mood boards',
      'Genki vocabulary',
      'Genki I and II',
      'Minna no Nihongo vocabulary',
      'Minna no Nihongo I and II',
      'Jisho vocabulary',
      'WaniKani integration',
      'Anki deck import',
      'Japanese flashcards',
      'YouTube shadowing practice',
      'NHK news reading',
      'AI Japanese stories',
      'Japanese learning games',
      'Japanese grammar resources',
      'hiragana katakana practice',
      'spaced repetition Japanese',
      'comprehensive Japanese study',
      'Japanese language app'
    ],
    structuredData: ['website', 'organization', 'educationalApp']
  },
  '/vocabulary': {
    title: 'Japanese Vocabulary Builder - Jisho, WaniKani & Textbooks',
    description: 'Build vocabulary with our comprehensive database featuring complete word sets from Genki I & II and Minna no Nihongo I & II textbooks, plus Jisho and WaniKani integration. Search kanji and words with meanings, readings, pitch accent, example sentences. Import Anki decks and practice with spaced repetition.',
    keywords: [
      'Japanese vocabulary',
      'Genki vocabulary',
      'Genki I vocabulary',
      'Genki II vocabulary',
      'Minna no Nihongo vocabulary',
      'Minna no Nihongo I',
      'Minna no Nihongo II',
      'Jisho integration',
      'WaniKani vocabulary',
      'Japanese dictionary',
      'kanji search',
      'pitch accent',
      'JLPT vocabulary',
      'Anki import'
    ],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Vocabulary', url: '/vocabulary' }]
  },
  '/tools/textbook-vocabulary': {
    title: 'Textbook Vocabulary - Complete Genki & Minna no Nihongo',
    description: 'Study complete vocabulary sets from Genki I & II (1,700+ words) and Minna no Nihongo I & II (2,800+ words). Practice with interactive flashcards, spaced repetition, and track your progress through all chapters.',
    keywords: [
      'Genki vocabulary',
      'Genki 1 vocabulary',
      'Genki 2 vocabulary',
      'Minna no Nihongo vocabulary',
      'Minna no Nihongo 1',
      'Minna no Nihongo 2',
      'Japanese textbook vocabulary',
      'textbook flashcards',
      'spaced repetition',
      'chapter vocabulary'
    ],
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
      { name: 'Textbook Vocabulary', url: '/tools/textbook-vocabulary' }
    ]
  },
  '/practice': {
    title: 'Japanese Practice - Conjugations, Kana & Drills',
    description: 'Master Japanese through interactive practice: verb and adjective conjugations, hiragana/katakana drills, kanji writing practice, and comprehensive exercises. Features content from Genki and Minna no Nihongo textbooks.',
    keywords: ['Japanese practice', 'conjugation practice', 'hiragana practice', 'katakana practice', 'kanji practice', 'Japanese drills', 'Genki exercises', 'Minna no Nihongo practice'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Practice', url: '/practice' }]
  },
  '/games': {
    title: 'Japanese Learning Games - Kanji, Vocabulary & More',
    description: 'Learn Japanese through engaging games: Kanji Simon Says, Reading Routes, stroke order practice, vocabulary matching, and more. Features content from Genki, Minna no Nihongo, and JLPT levels.',
    keywords: ['Japanese games', 'kanji games', 'vocabulary games', 'learning games', 'Kanji Simon', 'Reading Routes', 'stroke order game', 'educational games'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Games', url: '/games' }]
  },
  '/news': {
    title: 'Japanese News Reader - NHK News with Furigana',
    description: 'Read real Japanese news from NHK with automatic furigana, vocabulary lookup, and grammar explanations. Perfect for intermediate learners to improve reading comprehension with current events.',
    keywords: ['Japanese news', 'NHK news', 'Japanese reading', 'news with furigana', 'reading comprehension', 'current events Japanese', 'Japanese articles'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'News', url: '/news' }]
  },
  '/stories': {
    title: 'Japanese Stories - AI Generated & Graded Readers',
    description: 'Read engaging Japanese stories tailored to your level. Features AI-generated stories, classic tales, and graded readers with furigana support, vocabulary help, and comprehension exercises.',
    keywords: ['Japanese stories', 'AI stories', 'graded readers', 'Japanese tales', 'reading practice', 'Japanese literature', 'story comprehension'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Stories', url: '/stories' }]
  },
  '/kanji-browser': {
    title: 'Kanji Browser - JLPT, Grade Levels & Radicals',
    description: 'Browse and study kanji organized by JLPT levels (N5-N1), school grades, or radicals. View stroke order animations, meanings, readings, compounds, and example sentences for over 2,000 kanji.',
    keywords: ['kanji browser', 'JLPT kanji', 'kanji by grade', 'kanji radicals', 'stroke order', 'kanji dictionary', 'kanji study', 'N5 kanji', 'N4 kanji', 'N3 kanji', 'N2 kanji', 'N1 kanji'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Kanji Browser', url: '/kanji-browser' }]
  },
  '/kanji-moods': {
    title: 'Kanji Mood Boards - Learn Kanji by Theme',
    description: 'Study kanji grouped by themes and moods: nature, emotions, seasons, daily life, and more. Visual learning with beautiful mood boards that help you remember kanji through contextual associations.',
    keywords: ['kanji mood boards', 'themed kanji', 'kanji by theme', 'visual kanji learning', 'kanji groups', 'contextual kanji', 'kanji categories'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Kanji Moods', url: '/kanji-moods' }]
  },
  '/drill': {
    title: 'Japanese Drills - Conjugation & Vocabulary Practice',
    description: 'Master Japanese with focused drill exercises: verb conjugations, adjective forms, vocabulary from Genki and Minna no Nihongo, and kanji recognition. Features spaced repetition and progress tracking.',
    keywords: ['Japanese drills', 'conjugation drills', 'vocabulary drills', 'spaced repetition', 'Genki drills', 'Minna drills', 'practice exercises'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Drills', url: '/drill' }]
  },
  '/tools/youtube-shadowing': {
    title: 'YouTube Shadowing - Japanese Pronunciation Practice',
    description: 'Practice Japanese shadowing with any YouTube video. Extract audio, get AI-generated transcripts, practice pronunciation, and improve listening skills with native content.',
    keywords: ['Japanese shadowing', 'YouTube shadowing', 'pronunciation practice', 'listening practice', 'Japanese audio', 'speech practice', 'native content'],
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
      { name: 'YouTube Shadowing', url: '/tools/youtube-shadowing' }
    ]
  },
  '/resources': {
    title: 'Japanese Learning Resources - Grammar & Study Guides',
    description: 'Access curated Japanese learning resources from top creators: comprehensive grammar guides, study tips, learning strategies, and expert recommendations for all levels.',
    keywords: ['Japanese resources', 'grammar guides', 'study resources', 'learning tips', 'Japanese creators', 'study guides', 'learning strategies'],
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Resources', url: '/resources' }]
  },
  '/settings': {
    title: 'Settings',
    description: 'Manage your Dōshi Sensei settings, preferences, learning goals, and study options',
    breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Settings', url: '/settings' }]
  },
  '/account': {
    title: 'My Account',
    description: 'Manage your Dōshi Sensei account, subscription, study progress, and achievements',
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
    description: `${pageName} - Learn Japanese with Dōshi Sensei's comprehensive platform featuring Genki & Minna no Nihongo vocabulary, kanji study, and interactive practice`,
    breadcrumb: [{ name: 'Home', url: '/' }, { name: pageName, url: `/${dirName}` }]
  };
}

// Update files that need Doshi -> Dōshi
async function updateDoshiSpelling() {
  console.log('\nUpdating Doshi to Dōshi...');
  
  // Update layout.tsx
  try {
    const layoutPath = '/home/mate/Dev/NextProjects/doshi-sensei/src/app/layout.tsx';
    let layoutContent = await fs.readFile(layoutPath, 'utf8');
    
    // Update all instances of Doshi Sensei to Dōshi Sensei in metadata
    layoutContent = layoutContent.replace(/Doshi Sensei/g, 'Dōshi Sensei');
    
    // Also update the description to be comprehensive
    layoutContent = layoutContent.replace(
      /description: 'Learn Japanese verb and adjective conjugations with interactive practice, drills, and vocabulary\. Master ichidan, godan, and irregular verbs with professional guidance\.'/,
      `description: '${FULL_SITE_DESCRIPTION}'`
    );
    
    await fs.writeFile(layoutPath, layoutContent);
    console.log('✓ Updated layout.tsx');
  } catch (error) {
    console.error('Error updating layout.tsx:', error.message);
  }
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
    const importMatch = content.match(/import (\w+) from '\.\/(\w+)'/);
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

async function main() {
  console.log('Starting comprehensive SEO update...\n');
  
  // First update Doshi spelling
  await updateDoshiSpelling();
  
  // Then update all pages
  try {
    const pageFiles = await glob('src/app/**/page.tsx', {
      absolute: true,
      cwd: '/home/mate/Dev/NextProjects/doshi-sensei'
    });
    
    console.log(`\nFound ${pageFiles.length} page files to process\n`);
    
    let enhancedCount = 0;
    let skippedCount = 0;
    
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
    console.log(`\n✓ All updates complete!`);
    
  } catch (error) {
    console.error('Error enhancing pages:', error);
  }
}

main();