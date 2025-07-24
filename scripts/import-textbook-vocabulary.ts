#!/usr/bin/env tsx
/**
 * Import Textbook Vocabulary from MCP Server
 * This script fetches vocabulary data from the MCP anki-word-generator server
 * and saves it as static JSON files in the project.
 * 
 * Usage: npm run import:textbook-vocab
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_BASE_URL = 'http://localhost:8080';
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'textbook-vocabulary');

interface MCPCard {
  id: string;
  japanese: string;
  reading: string | null;
  meaning: string;
  example_sentence: string | null;
  example_translation: string | null;
  audio: string | null;
  image: string | null;
  tags: string[];
  jlpt_level: string | null;
  part_of_speech: string[] | null;
  source_deck: string;
  additional_fields?: Record<string, string>;
}

interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string;
  meaning: string;
  jlptLevel: string | null;
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
  notes?: string;
}

async function fetchFromMCP(endpoint: string, body?: any): Promise<any> {
  const response = await fetch(`${MCP_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {})
  });
  
  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.statusText}`);
  }
  
  return response.json();
}

function extractLessonNumber(deckName: string, tags: string[], additional_fields?: Record<string, string>): number {
  // Try to extract from additional fields first
  if (additional_fields) {
    // Check for lesson field
    for (const [key, value] of Object.entries(additional_fields)) {
      if (key.toLowerCase().includes('lesson') || key.toLowerCase().includes('chapter')) {
        const match = value.match(/\d+/);
        if (match) {
          const lesson = parseInt(match[0]);
          if (lesson >= 1 && lesson <= 50) return lesson;
        }
      }
    }
    
    // Check for numeric fields that might be lesson numbers
    for (const value of Object.values(additional_fields)) {
      const match = value.match(/^\d+$/);
      if (match) {
        const lesson = parseInt(match[0]);
        if (lesson >= 1 && lesson <= 50) return lesson;
      }
    }
  }
  
  // Try multiple patterns to extract lesson numbers
  const patterns = [
    /lesson\s*(\d+)/i,
    /chapter\s*(\d+)/i,
    /第(\d+)課/,
    /L(\d+)/,
  ];
  
  // Check deck name
  for (const pattern of patterns) {
    const match = deckName.match(pattern);
    if (match) {
      const lesson = parseInt(match[1]);
      if (lesson >= 1 && lesson <= 50) return lesson;
    }
  }
  
  // Check tags
  for (const tag of tags) {
    for (const pattern of patterns) {
      const match = tag.match(pattern);
      if (match) {
        const lesson = parseInt(match[1]);
        if (lesson >= 1 && lesson <= 50) return lesson;
      }
    }
  }
  
  // For Minna no Nihongo, try to extract from deck name range
  if (deckName.includes('1 - 50')) {
    // Distribute cards across lessons based on ID
    return Math.floor(Math.random() * 25) + 1; // Random distribution for now
  }
  
  return 1; // Default to lesson 1
}

function determineTextbook(deckName: string): { book: string; volume: number } | null {
  const deckLower = deckName.toLowerCase();
  
  if (deckLower.includes('genki')) {
    if (deckLower.includes('2') && !deckLower.includes('1')) {
      return { book: 'genki', volume: 2 };
    }
    return { book: 'genki', volume: 1 };
  }
  
  if (deckLower.includes('minna')) {
    // Check for explicit volume 2
    if (deckLower.includes('2') && !deckLower.includes('1')) {
      return { book: 'minna', volume: 2 };
    }
    // Check for combined 1 & 2
    if (deckLower.includes('1') && deckLower.includes('2')) {
      // Use lesson numbers to determine volume
      return { book: 'minna', volume: 1 }; // Will be adjusted based on lesson
    }
    return { book: 'minna', volume: 1 };
  }
  
  return null;
}

function transformCard(card: MCPCard): VocabularyItem | null {
  // Skip cards without essential fields
  if (!card.japanese || !card.meaning) {
    return null;
  }
  
  const textbookInfo = determineTextbook(card.source_deck);
  if (!textbookInfo) return null;
  
  let lesson = extractLessonNumber(
    card.source_deck, 
    card.tags, 
    card.additional_fields
  );
  
  // For Minna 1 & 2 combined deck, adjust textbook based on lesson
  let textbook = `${textbookInfo.book}-${textbookInfo.volume}`;
  if (textbookInfo.book === 'minna' && card.source_deck.includes('1') && card.source_deck.includes('2')) {
    if (lesson > 25) {
      textbook = 'minna-2';
      lesson = lesson - 25; // Adjust lesson number for volume 2
    }
  }
  
  const examples = [];
  if (card.example_sentence) {
    examples.push({
      japanese: card.example_sentence,
      reading: '', // MCP doesn't provide reading for examples
      english: card.example_translation || ''
    });
  }
  
  // Clean up reading - use japanese if reading is null
  const reading = card.reading || card.japanese;
  
  return {
    id: `${textbook}-${lesson}-${card.id}`,
    japanese: card.japanese,
    reading: reading,
    meaning: card.meaning,
    jlptLevel: card.jlpt_level,
    partOfSpeech: card.part_of_speech || [],
    examples,
    audioFile: card.audio || undefined,
    tags: [...card.tags, `lesson-${lesson}`],
    lesson,
    textbook,
    notes: card.additional_fields?.notes
  };
}

async function organizeByLesson(cards: VocabularyItem[]): Promise<Map<number, VocabularyItem[]>> {
  const lessonMap = new Map<number, VocabularyItem[]>();
  
  for (const card of cards) {
    if (!lessonMap.has(card.lesson)) {
      lessonMap.set(card.lesson, []);
    }
    lessonMap.get(card.lesson)!.push(card);
  }
  
  // Sort cards within each lesson by Japanese text
  for (const [lesson, lessonCards] of lessonMap.entries()) {
    lessonCards.sort((a, b) => a.japanese.localeCompare(b.japanese, 'ja'));
  }
  
  return lessonMap;
}

async function generateThemeIndex(allCards: VocabularyItem[]): Promise<Record<string, string[]>> {
  const themes: Record<string, Set<string>> = {
    food: new Set(),
    time: new Set(),
    school: new Set(),
    family: new Set(),
    travel: new Set(),
    shopping: new Set(),
    weather: new Set(),
    hobbies: new Set(),
    work: new Set(),
    health: new Set(),
    daily: new Set(),
    emotions: new Set(),
    transportation: new Set(),
    nature: new Set(),
    technology: new Set()
  };
  
  const themeKeywords: Record<string, string[]> = {
    food: ['食', '飲', 'eat', 'drink', 'meal', 'restaurant', '料理', 'ごはん', 'たべ', 'のみ', 'おいしい', '味'],
    time: ['時', '分', '曜日', 'time', 'hour', 'minute', 'day', 'week', '今日', '明日', '昨日', '朝', '夜', '午前', '午後'],
    school: ['学', '校', '生', 'student', 'school', 'class', 'teacher', '先生', '勉強', '授業', '大学', '宿題', '試験'],
    family: ['家族', '母', '父', '兄', '姉', '弟', '妹', 'family', 'mother', 'father', 'parent', '子供', '両親'],
    travel: ['行', '来', '旅行', 'go', 'come', 'travel', 'trip', '飛行機', '電車', 'ホテル', '国', '外国'],
    shopping: ['買', '店', 'buy', 'shop', 'store', 'money', '円', '高い', '安い', '値段', 'デパート', 'スーパー'],
    weather: ['天気', '雨', '晴', 'weather', 'rain', 'sunny', '寒い', '暑い', '雪', '風', '曇り'],
    hobbies: ['趣味', '音楽', 'スポーツ', 'hobby', 'music', 'sport', '遊', '映画', '読', 'ゲーム', '歌'],
    work: ['仕事', '会社', '働', 'work', 'company', 'job', 'office', '忙しい', '休み', '給料'],
    health: ['病', '医', '元気', 'sick', 'doctor', 'healthy', 'hospital', '薬', '痛い', '体', '頭'],
    daily: ['毎日', '朝', '起', '寝', 'everyday', 'morning', 'wake', 'sleep', '歯', '風呂', '着る', '洗う'],
    emotions: ['楽しい', '嬉しい', '悲しい', '怒', 'happy', 'sad', 'angry', '好き', '嫌い', '心配'],
    transportation: ['車', '電車', 'バス', 'タクシー', '自転車', '駅', '歩', '乗る', '降りる'],
    nature: ['山', '海', '川', '木', '花', 'mountain', 'sea', 'river', 'tree', 'flower', '空', '太陽'],
    technology: ['電話', 'パソコン', 'インターネット', 'メール', 'computer', 'phone', 'internet', 'email', '携帯']
  };
  
  for (const card of allCards) {
    const searchText = `${card.japanese} ${card.meaning} ${card.reading} ${card.tags.join(' ')}`.toLowerCase();
    
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
        themes[theme].add(card.id);
      }
    }
  }
  
  // Convert Sets to Arrays
  const themeIndex: Record<string, string[]> = {};
  for (const [theme, ids] of Object.entries(themes)) {
    if (ids.size > 0) {
      themeIndex[theme] = Array.from(ids);
    }
  }
  
  return themeIndex;
}

async function writeFiles(textbook: string, lessonMap: Map<number, VocabularyItem[]>, metadata: any) {
  const textbookDir = path.join(OUTPUT_DIR, textbook);
  await fs.mkdir(textbookDir, { recursive: true });
  
  // Write metadata
  await fs.writeFile(
    path.join(textbookDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  // Write lesson files
  for (const [lesson, cards] of lessonMap.entries()) {
    await fs.writeFile(
      path.join(textbookDir, `lesson-${lesson}.json`),
      JSON.stringify(cards, null, 2)
    );
  }
  
  // Write combined file for all lessons
  const allCards = Array.from(lessonMap.values()).flat();
  await fs.writeFile(
    path.join(textbookDir, 'all.json'),
    JSON.stringify(allCards, null, 2)
  );
}

async function main() {
  console.log('🚀 Starting vocabulary import from MCP server...\n');
  
  try {
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Get deck info
    const deckInfo = await fetchFromMCP('/get_deck_info');
    console.log('📊 Available decks:', deckInfo);
    
    // Define textbook mappings
    const textbookMappings = {
      'genki-1': {
        decks: ['Genki 1 2 Kanji'],
        metadata: {
          title: 'Genki 1',
          subtitle: 'Elementary Japanese',
          jlptLevels: ['N5', 'N4'],
          description: 'The first volume of the popular Genki textbook series',
          color: {
            primary: '#EC4899',
            secondary: '#A855F7',
            gradient: 'from-pink-400 to-purple-500'
          }
        }
      },
      'genki-2': {
        decks: ['Genki 2 3rd edition with sound files', 'Genki 1 2 Kanji'], // Include combined deck
        metadata: {
          title: 'Genki 2',
          subtitle: 'Elementary Japanese II',
          jlptLevels: ['N4', 'N3'],
          description: 'The second volume of the popular Genki textbook series',
          color: {
            primary: '#A855F7',
            secondary: '#6366F1',
            gradient: 'from-purple-400 to-indigo-500'
          }
        }
      },
      'minna-1': {
        decks: ['Japanese Minna No Nihongo 1', 'Japanese Minna no Nihongo 1 2 Lessons 1 - 50'],
        metadata: {
          title: 'Minna no Nihongo 1',
          subtitle: 'Japanese for Everyone',
          jlptLevels: ['N5', 'N4'],
          description: 'The first volume of the comprehensive Minna no Nihongo series',
          color: {
            primary: '#10B981',
            secondary: '#14B8A6',
            gradient: 'from-green-400 to-teal-500'
          }
        }
      },
      'minna-2': {
        decks: ['Japanese Minna no Nihongo 1 2 Lessons 1 - 50'], // Will filter by lesson
        metadata: {
          title: 'Minna no Nihongo 2',
          subtitle: 'Japanese for Everyone II',
          jlptLevels: ['N4', 'N3'],
          description: 'The second volume of the comprehensive Minna no Nihongo series',
          color: {
            primary: '#14B8A6',
            secondary: '#3B82F6',
            gradient: 'from-teal-400 to-blue-500'
          }
        }
      }
    };
    
    const allVocabulary: VocabularyItem[] = [];
    
    // Process each textbook
    for (const [textbookId, config] of Object.entries(textbookMappings)) {
      console.log(`\n📚 Processing ${config.metadata.title}...`);
      
      const textbookCards: VocabularyItem[] = [];
      
      for (const deckName of config.decks) {
        try {
          console.log(`  - Fetching cards from "${deckName}"...`);
          
          // Fetch all cards from this deck
          let allDeckCards: MCPCard[] = [];
          let offset = 0;
          const limit = 500; // Fetch in batches
          
          while (true) {
            const response = await fetchFromMCP('/get_cards', { 
              deck: deckName, 
              limit, 
              offset 
            });
            
            const cards = response.cards || [];
            allDeckCards = allDeckCards.concat(cards);
            
            console.log(`    Fetched ${cards.length} cards (total: ${allDeckCards.length})`);
            
            if (cards.length < limit || allDeckCards.length >= response.total_count) {
              break;
            }
            
            offset += limit;
          }
          
          const transformed = allDeckCards
            .map((card: MCPCard) => transformCard(card))
            .filter((card: VocabularyItem | null): card is VocabularyItem => 
              card !== null && card.textbook === textbookId
            );
          
          textbookCards.push(...transformed);
          console.log(`    Transformed ${transformed.length} cards for ${textbookId}`);
        } catch (error) {
          console.warn(`    Warning: Could not fetch deck "${deckName}":`, error);
        }
      }
      
      if (textbookCards.length > 0) {
        // Organize by lesson
        const lessonMap = await organizeByLesson(textbookCards);
        
        // Update metadata with actual data
        const metadata = {
          ...config.metadata,
          totalCards: textbookCards.length,
          lessons: Array.from(lessonMap.keys()).sort((a, b) => a - b)
        };
        
        // Write files
        await writeFiles(textbookId, lessonMap, metadata);
        
        allVocabulary.push(...textbookCards);
        console.log(`  ✅ Wrote ${textbookCards.length} cards across ${lessonMap.size} lessons`);
      }
    }
    
    // Generate master index
    console.log('\n📋 Generating master index...');
    const masterIndex = {
      totalCards: allVocabulary.length,
      textbooks: {} as Record<string, any>,
      jlptDistribution: {
        N5: 0,
        N4: 0,
        N3: 0,
        N2: 0,
        N1: 0,
        null: 0
      }
    };
    
    // Count JLPT distribution
    for (const card of allVocabulary) {
      const level = card.jlptLevel || 'null';
      masterIndex.jlptDistribution[level as keyof typeof masterIndex.jlptDistribution]++;
    }
    
    // Add textbook summaries
    for (const [textbookId, config] of Object.entries(textbookMappings)) {
      const textbookCards = allVocabulary.filter(c => c.textbook === textbookId);
      const lessons = [...new Set(textbookCards.map(c => c.lesson))].sort((a, b) => a - b);
      
      masterIndex.textbooks[textbookId] = {
        title: config.metadata.title,
        cardCount: textbookCards.length,
        lessons
      };
    }
    
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'index.json'),
      JSON.stringify(masterIndex, null, 2)
    );
    
    // Generate theme index
    console.log('🏷️  Generating theme index...');
    const themeIndex = await generateThemeIndex(allVocabulary);
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'themes.json'),
      JSON.stringify(themeIndex, null, 2)
    );
    
    // Summary
    console.log('\n✅ Import complete!');
    console.log(`📁 Generated files in: ${OUTPUT_DIR}`);
    console.log(`📊 Total cards imported: ${allVocabulary.length}`);
    console.log('\nTextbook breakdown:');
    for (const [id, summary] of Object.entries(masterIndex.textbooks)) {
      console.log(`  - ${summary.title}: ${summary.cardCount} cards, ${summary.lessons.length} lessons`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
main();