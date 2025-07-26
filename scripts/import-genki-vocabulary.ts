#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
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

async function fetchCardsFromDeck(deckName: string, limit: number = 1000): Promise<MCPCard[]> {
  const response = await fetch('http://localhost:8080/get_cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deck: deckName, limit })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.cards;
}

function extractLessonNumber(card: MCPCard): number {
  // Try to extract lesson number from various fields
  const fields = [
    card.example_translation,
    card.additional_fields?.field_3,
    card.additional_fields?.lesson,
    card.additional_fields?.tags
  ];
  
  for (const field of fields) {
    if (field && typeof field === 'string') {
      const match = field.match(/\b(\d+)\b/);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 23) { // Genki has up to lesson 23
          return num;
        }
      }
    }
  }
  
  // Default to lesson 1 if can't determine
  return 1;
}

function convertToVocabularyItem(card: MCPCard, textbook: string): VocabularyItem {
  const lesson = extractLessonNumber(card);
  
  return {
    id: `${textbook}-${lesson}-${card.id}`,
    japanese: card.japanese || '',
    reading: card.reading || card.japanese || '',
    meaning: card.meaning || '',
    jlptLevel: (card.jlpt_level as any) || null,
    partOfSpeech: card.part_of_speech ? [card.part_of_speech] : [],
    examples: card.example_sentence ? [{
      japanese: card.example_sentence,
      reading: '',
      english: card.example_translation || ''
    }] : [],
    tags: [card.jlpt_level?.toLowerCase() || 'unknown', `lesson-${lesson}`].filter(Boolean),
    lesson,
    textbook
  };
}

async function analyzeGenkiCards() {
  console.log('Fetching Genki cards from MCP server...');
  
  try {
    // Fetch all cards from the Genki deck
    const cards = await fetchCardsFromDeck('Genki_1__2_Kanji_ (1)', 1000);
    console.log(`Fetched ${cards.length} cards from Genki deck`);
    
    // Analyze lesson distribution
    const lessonMap = new Map<number, MCPCard[]>();
    const genki1Cards: MCPCard[] = [];
    const genki2Cards: MCPCard[] = [];
    
    cards.forEach(card => {
      const lesson = extractLessonNumber(card);
      if (!lessonMap.has(lesson)) {
        lessonMap.set(lesson, []);
      }
      lessonMap.get(lesson)!.push(card);
      
      // Genki 1 has lessons 1-12, Genki 2 has lessons 13-23
      if (lesson <= 12) {
        genki1Cards.push(card);
      } else {
        genki2Cards.push(card);
      }
    });
    
    console.log('\nLesson distribution:');
    const sortedLessons = Array.from(lessonMap.keys()).sort((a, b) => a - b);
    sortedLessons.forEach(lesson => {
      console.log(`  Lesson ${lesson}: ${lessonMap.get(lesson)!.length} cards`);
    });
    
    console.log(`\nGenki 1 cards: ${genki1Cards.length}`);
    console.log(`Genki 2 cards: ${genki2Cards.length}`);
    
    // If we have Genki 2 cards, import them
    if (genki2Cards.length > 0) {
      console.log('\nImporting Genki 2 vocabulary...');
      
      const genki2Dir = join(__dirname, '../src/data/textbook-vocabulary/genki-2');
      if (!existsSync(genki2Dir)) {
        mkdirSync(genki2Dir, { recursive: true });
      }
      
      // Convert cards to vocabulary items
      const genki2Vocab = genki2Cards.map(card => convertToVocabularyItem(card, 'genki-2'));
      
      // Group by lesson
      const genki2LessonMap = new Map<number, VocabularyItem[]>();
      genki2Vocab.forEach(item => {
        if (!genki2LessonMap.has(item.lesson)) {
          genki2LessonMap.set(item.lesson, []);
        }
        genki2LessonMap.get(item.lesson)!.push(item);
      });
      
      // Write lesson files
      genki2LessonMap.forEach((items, lesson) => {
        const filePath = join(genki2Dir, `lesson-${lesson}.json`);
        writeFileSync(filePath, JSON.stringify(items, null, 2));
        console.log(`  Written ${items.length} items to lesson-${lesson}.json`);
      });
      
      // Write all.json
      writeFileSync(join(genki2Dir, 'all.json'), JSON.stringify(genki2Vocab, null, 2));
      
      // Update metadata
      const metadata = {
        title: 'Genki 2',
        totalCards: genki2Vocab.length,
        lessons: Array.from(genki2LessonMap.keys()).sort((a, b) => a - b),
        jlptDistribution: {},
        partOfSpeechDistribution: {},
        source: 'MCP anki-word-generator',
        note: 'Extracted from Genki_1__2_Kanji deck (lessons 13-23)'
      };
      
      writeFileSync(join(genki2Dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
      console.log('\n✅ Genki 2 vocabulary imported successfully!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
analyzeGenkiCards();