#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

interface MCPCard {
  id: string;
  japanese: string;
  reading?: string | null;
  meaning: string;
  example_sentence?: string;
  example_translation?: string;
  jlpt_level?: string;
  part_of_speech?: string | null;
  additional_fields?: any;
  source_deck: string;
}

interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string;
  meaning: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null;
  partOfSpeech: string[];
  examples: {
    japanese: string;
    reading: string;
    english: string;
  }[];
  audioFile?: string;
  tags: string[];
  lesson: number;
  textbook: string;
}

interface TextbookInfo {
  deckName: string;
  textbookId: string;
  title: string;
  lessonRange: [number, number];
}

const TEXTBOOK_MAPPINGS: TextbookInfo[] = [
  {
    deckName: 'Genki_1__2_Kanji_ (1)',
    textbookId: 'genki-1',
    title: 'Genki 1',
    lessonRange: [1, 12]
  },
  {
    deckName: 'Genki_1__2_Kanji_ (1)',
    textbookId: 'genki-2',
    title: 'Genki 2',
    lessonRange: [13, 23]
  },
  {
    deckName: 'Japanese_Minna_No_Nihongo_1',
    textbookId: 'minna-1',
    title: 'Minna no Nihongo 1',
    lessonRange: [1, 25]
  },
  {
    deckName: 'Japanese_Minna_no_Nihongo_1__2_Lessons_1_-_50',
    textbookId: 'minna-2',
    title: 'Minna no Nihongo 2',
    lessonRange: [26, 50]
  }
];

async function fetchAllCards(deckName: string): Promise<MCPCard[]> {
  const allCards: MCPCard[] = [];
  let offset = 0;
  const limit = 500;
  
  while (true) {
    const response = await fetch('http://localhost:8080/get_cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck: deckName, limit, offset })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    allCards.push(...data.cards);
    
    if (data.cards.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  return allCards;
}

function extractLessonNumber(card: MCPCard): number {
  // Try to extract lesson number from various fields
  const searchFields = [
    card.example_translation,
    card.additional_fields?.field_3,
    card.additional_fields?.lesson,
    card.additional_fields?.tags,
    // Sometimes lesson is in the Japanese field for section headers
    card.japanese
  ];
  
  for (const field of searchFields) {
    if (field && typeof field === 'string') {
      // Look for patterns like "Lesson 1", "L1", "第1課", or just numbers
      const patterns = [
        /[Ll]esson\s*(\d+)/,
        /L(\d+)/,
        /第(\d+)課/,
        /\b(\d+)\b/
      ];
      
      for (const pattern of patterns) {
        const match = field.match(pattern);
        if (match) {
          const num = parseInt(match[1]);
          if (num >= 1 && num <= 50) {
            return num;
          }
        }
      }
    }
  }
  
  // Default to lesson 1 if can't determine
  return 1;
}

function cleanJapaneseText(text: string): string {
  // Remove special characters and clean up
  return text
    .replace(/[()（）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferPartOfSpeech(card: MCPCard): string[] {
  const pos = card.part_of_speech;
  if (!pos) return [];
  
  // Normalize part of speech
  const normalized = pos.toLowerCase();
  
  const mapping: Record<string, string> = {
    'noun': 'noun',
    'verb': 'verb',
    'i-adjective': 'i-adjective',
    'na-adjective': 'na-adjective',
    'adverb': 'adverb',
    'particle': 'particle',
    'counter': 'counter',
    'expression': 'expression',
    'conjunction': 'conjunction',
    'interjection': 'interjection'
  };
  
  for (const [key, value] of Object.entries(mapping)) {
    if (normalized.includes(key)) {
      return [value];
    }
  }
  
  return [pos]; // Return original if no mapping found
}

function convertToVocabularyItem(card: MCPCard, textbook: string, lesson: number): VocabularyItem {
  return {
    id: `${textbook}-${lesson}-${card.id}`,
    japanese: cleanJapaneseText(card.japanese || ''),
    reading: card.reading || cleanJapaneseText(card.japanese || ''),
    meaning: card.meaning || '',
    jlptLevel: (card.jlpt_level as any) || null,
    partOfSpeech: inferPartOfSpeech(card),
    examples: card.example_sentence ? [{
      japanese: card.example_sentence,
      reading: '',
      english: card.example_translation || ''
    }] : [],
    tags: [
      card.jlpt_level?.toLowerCase() || '',
      `lesson-${lesson}`,
      textbook
    ].filter(Boolean),
    lesson,
    textbook
  };
}

async function importTextbook(info: TextbookInfo) {
  console.log(`\nImporting ${info.title}...`);
  
  try {
    // Fetch all cards from the deck
    const allCards = await fetchAllCards(info.deckName);
    console.log(`  Fetched ${allCards.length} total cards from ${info.deckName}`);
    
    // Filter cards by lesson range
    const relevantCards = allCards.filter(card => {
      const lesson = extractLessonNumber(card);
      return lesson >= info.lessonRange[0] && lesson <= info.lessonRange[1];
    });
    
    console.log(`  Found ${relevantCards.length} cards for ${info.title} (lessons ${info.lessonRange[0]}-${info.lessonRange[1]})`);
    
    if (relevantCards.length === 0) {
      console.log(`  ⚠️  No cards found for ${info.title}`);
      return;
    }
    
    // Create directory
    const textbookDir = join(__dirname, '../src/data/textbook-vocabulary', info.textbookId);
    if (existsSync(textbookDir)) {
      rmSync(textbookDir, { recursive: true, force: true });
    }
    mkdirSync(textbookDir, { recursive: true });
    
    // Convert and group by lesson
    const lessonMap = new Map<number, VocabularyItem[]>();
    const allVocabulary: VocabularyItem[] = [];
    
    relevantCards.forEach(card => {
      const lesson = extractLessonNumber(card);
      const adjustedLesson = info.textbookId.includes('minna-2') ? lesson - 25 : lesson;
      
      const vocabItem = convertToVocabularyItem(card, info.textbookId, adjustedLesson);
      
      if (!lessonMap.has(adjustedLesson)) {
        lessonMap.set(adjustedLesson, []);
      }
      lessonMap.get(adjustedLesson)!.push(vocabItem);
      allVocabulary.push(vocabItem);
    });
    
    // Write lesson files
    const lessons = Array.from(lessonMap.keys()).sort((a, b) => a - b);
    lessons.forEach(lesson => {
      const items = lessonMap.get(lesson)!;
      // Remove duplicates based on japanese + meaning
      const uniqueItems = Array.from(
        new Map(items.map(item => [`${item.japanese}-${item.meaning}`, item])).values()
      );
      
      const filePath = join(textbookDir, `lesson-${lesson}.json`);
      writeFileSync(filePath, JSON.stringify(uniqueItems, null, 2));
      console.log(`    Written ${uniqueItems.length} items to lesson-${lesson}.json`);
    });
    
    // Write all.json (deduplicated)
    const uniqueAll = Array.from(
      new Map(allVocabulary.map(item => [`${item.japanese}-${item.meaning}`, item])).values()
    );
    writeFileSync(join(textbookDir, 'all.json'), JSON.stringify(uniqueAll, null, 2));
    
    // Calculate JLPT distribution
    const jlptDist: Record<string, number> = {};
    uniqueAll.forEach(item => {
      const level = item.jlptLevel || 'unknown';
      jlptDist[level] = (jlptDist[level] || 0) + 1;
    });
    
    // Write metadata
    const metadata = {
      title: info.title,
      totalCards: uniqueAll.length,
      lessons: lessons,
      jlptDistribution: jlptDist,
      partOfSpeechDistribution: {},
      source: 'MCP anki-word-generator',
      importDate: new Date().toISOString()
    };
    
    writeFileSync(join(textbookDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    
    console.log(`  ✅ ${info.title} imported successfully! (${uniqueAll.length} unique cards)`);
    
  } catch (error) {
    console.error(`  ❌ Error importing ${info.title}:`, error);
  }
}

async function updateMasterIndex() {
  console.log('\nUpdating master index...');
  
  const dataDir = join(__dirname, '../src/data/textbook-vocabulary');
  const textbooks = ['genki-1', 'genki-2', 'minna-1', 'minna-2'];
  
  let totalCards = 0;
  const textbookInfo: Record<string, any> = {};
  const jlptDistribution: Record<string, number> = {};
  
  for (const textbook of textbooks) {
    try {
      const metadataPath = join(dataDir, textbook, 'metadata.json');
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        textbookInfo[textbook] = {
          title: metadata.title,
          cardCount: metadata.totalCards,
          lessons: metadata.lessons
        };
        totalCards += metadata.totalCards;
        
        // Aggregate JLPT distribution
        Object.entries(metadata.jlptDistribution).forEach(([level, count]) => {
          jlptDistribution[level] = (jlptDistribution[level] || 0) + (count as number);
        });
      }
    } catch (error) {
      console.error(`  Error reading ${textbook} metadata:`, error);
    }
  }
  
  const index = {
    totalCards,
    textbooks: textbookInfo,
    jlptDistribution,
    lastUpdated: new Date().toISOString()
  };
  
  writeFileSync(join(dataDir, 'index.json'), JSON.stringify(index, null, 2));
  console.log('  ✅ Master index updated!');
}

async function main() {
  console.log('🚀 Starting complete textbook vocabulary re-import...\n');
  
  // Check if server is running
  try {
    const response = await fetch('http://localhost:8080/health');
    if (!response.ok) {
      throw new Error('Server not healthy');
    }
  } catch (error) {
    console.error('❌ MCP server is not running on http://localhost:8080');
    console.error('Please start the server first with:');
    console.error('  cd /home/mate/Dev/MCPs/anki-word-generator');
    console.error('  python src/http_server.py');
    process.exit(1);
  }
  
  // Import each textbook
  for (const textbook of TEXTBOOK_MAPPINGS) {
    await importTextbook(textbook);
  }
  
  // Update master index
  await updateMasterIndex();
  
  console.log('\n✨ All textbooks imported successfully!');
}

// For missing fs import
import { readFileSync } from 'fs';

// Run the script
main().catch(console.error);