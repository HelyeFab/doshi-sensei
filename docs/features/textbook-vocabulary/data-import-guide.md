# Textbook Vocabulary Data Import Guide

## Overview

This guide explains how to import vocabulary data from the MCP anki-word-generator server into static JSON files for the Doshi Sensei project. This is a one-time process performed during development.

## Prerequisites

1. MCP server running at `http://localhost:8080`
2. Node.js environment for running import scripts
3. Access to the Doshi Sensei project structure

## Step-by-Step Import Process

### 1. Start the MCP Server

```bash
cd /home/mate/Dev/MCPs/anki-word-generator
source venv/bin/activate
python src/http_server.py
```

Verify it's running by visiting: http://localhost:8080/api/get_deck_info

### 2. Create Import Script

Create `/scripts/import-textbook-vocabulary.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const MCP_BASE_URL = 'http://localhost:8080/api';
const OUTPUT_DIR = path.join(process.cwd(), 'src/data/textbook-vocabulary');

interface MCPCard {
  id: string;
  deck_name: string;
  card_type: string;
  fields: {
    Expression?: string;
    Meaning?: string;
    Reading?: string;
    'Sentence-English'?: string;
    'Sentence-Japanese'?: string;
    'Sentence-Reading'?: string;
  };
  tags: string[];
  jlpt_level?: string;
  part_of_speech?: string[];
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
}

async function fetchFromMCP(endpoint: string): Promise<any> {
  const response = await fetch(`${MCP_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.statusText}`);
  }
  return response.json();
}

function extractLessonNumber(deckName: string, tags: string[]): number {
  // Try to extract from deck name first
  const lessonMatch = deckName.match(/lesson[_\s-]?(\d+)/i) || 
                      deckName.match(/chapter[_\s-]?(\d+)/i) ||
                      deckName.match(/第(\d+)課/);
  
  if (lessonMatch) {
    return parseInt(lessonMatch[1]);
  }
  
  // Try tags
  for (const tag of tags) {
    const tagMatch = tag.match(/lesson[_\s-]?(\d+)/i);
    if (tagMatch) {
      return parseInt(tagMatch[1]);
    }
  }
  
  return 1; // Default to lesson 1
}

function transformCard(card: MCPCard, textbook: string): VocabularyItem | null {
  // Skip cards without essential fields
  if (!card.fields.Expression || !card.fields.Meaning) {
    return null;
  }
  
  const lesson = extractLessonNumber(card.deck_name, card.tags);
  
  const examples = [];
  if (card.fields['Sentence-Japanese']) {
    examples.push({
      japanese: card.fields['Sentence-Japanese'],
      reading: card.fields['Sentence-Reading'] || '',
      english: card.fields['Sentence-English'] || ''
    });
  }
  
  return {
    id: `${textbook}-${lesson}-${card.id}`,
    japanese: card.fields.Expression,
    reading: card.fields.Reading || '',
    meaning: card.fields.Meaning,
    jlptLevel: card.jlpt_level || null,
    partOfSpeech: card.part_of_speech || [],
    examples,
    audioFile: undefined, // Will be handled separately
    tags: card.tags,
    lesson,
    textbook
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
    health: new Set()
  };
  
  const themeKeywords = {
    food: ['食', '飲', 'eat', 'drink', 'meal', 'restaurant', '料理'],
    time: ['時', '分', '曜日', 'time', 'hour', 'minute', 'day', 'week', '今日', '明日'],
    school: ['学', '校', '生', 'student', 'school', 'class', 'teacher', '先生', '勉強'],
    family: ['家族', '母', '父', '兄', '姉', 'family', 'mother', 'father'],
    travel: ['行', '来', '旅行', 'go', 'come', 'travel', 'trip', '飛行機'],
    shopping: ['買', '店', 'buy', 'shop', 'store', 'money', '円', '高い', '安い'],
    weather: ['天気', '雨', '晴', 'weather', 'rain', 'sunny', '寒い', '暑い'],
    hobbies: ['趣味', '音楽', 'スポーツ', 'hobby', 'music', 'sport', '遊'],
    work: ['仕事', '会社', '働', 'work', 'company', 'job', 'office'],
    health: ['病', '医', '元気', 'sick', 'doctor', 'healthy', 'hospital']
  };
  
  for (const card of allCards) {
    const searchText = `${card.japanese} ${card.meaning} ${card.tags.join(' ')}`.toLowerCase();
    
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
        themes[theme].add(card.id);
      }
    }
  }
  
  // Convert Sets to Arrays
  const themeIndex: Record<string, string[]> = {};
  for (const [theme, ids] of Object.entries(themes)) {
    themeIndex[theme] = Array.from(ids);
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
}

async function main() {
  console.log('🚀 Starting vocabulary import from MCP...\n');
  
  try {
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Get deck info
    const deckInfo = await fetchFromMCP('/get_deck_info');
    console.log('📊 Available decks:', deckInfo);
    
    // Process Genki decks
    console.log('\n📚 Processing Genki vocabulary...');
    const genkiDecks = ['Genki 1', 'Genki 2', 'Genki 1 Kanji', 'Genki 2 Kanji'];
    const genkiCards: VocabularyItem[] = [];
    
    for (const deck of genkiDecks) {
      const cards = await fetchFromMCP(`/get_cards?deck=${encodeURIComponent(deck)}`);
      console.log(`  - ${deck}: ${cards.length} cards`);
      
      const transformed = cards
        .map((card: MCPCard) => transformCard(card, deck.includes('1') ? 'genki-1' : 'genki-2'))
        .filter(Boolean);
      
      genkiCards.push(...transformed);
    }
    
    // Organize Genki by textbook
    const genki1Cards = genkiCards.filter(c => c.textbook === 'genki-1');
    const genki2Cards = genkiCards.filter(c => c.textbook === 'genki-2');
    
    const genki1Lessons = await organizeByLesson(genki1Cards);
    const genki2Lessons = await organizeByLesson(genki2Cards);
    
    // Write Genki files
    await writeFiles('genki-1', genki1Lessons, {
      title: 'Genki 1',
      totalCards: genki1Cards.length,
      lessons: Array.from(genki1Lessons.keys()).sort((a, b) => a - b),
      jlptLevels: ['N5', 'N4']
    });
    
    await writeFiles('genki-2', genki2Lessons, {
      title: 'Genki 2',
      totalCards: genki2Cards.length,
      lessons: Array.from(genki2Lessons.keys()).sort((a, b) => a - b),
      jlptLevels: ['N4', 'N3']
    });
    
    // Process Minna no Nihongo decks
    console.log('\n📚 Processing Minna no Nihongo vocabulary...');
    const minnaDecks = ['Minna No Nihongo 1', 'Minna No Nihongo 2'];
    const minnaCards: VocabularyItem[] = [];
    
    for (const deck of minnaDecks) {
      const cards = await fetchFromMCP(`/get_cards?deck=${encodeURIComponent(deck)}`);
      console.log(`  - ${deck}: ${cards.length} cards`);
      
      const transformed = cards
        .map((card: MCPCard) => transformCard(card, deck.includes('1') ? 'minna-1' : 'minna-2'))
        .filter(Boolean);
      
      minnaCards.push(...transformed);
    }
    
    // Organize Minna by textbook
    const minna1Cards = minnaCards.filter(c => c.textbook === 'minna-1');
    const minna2Cards = minnaCards.filter(c => c.textbook === 'minna-2');
    
    const minna1Lessons = await organizeByLesson(minna1Cards);
    const minna2Lessons = await organizeByLesson(minna2Cards);
    
    // Write Minna files
    await writeFiles('minna-1', minna1Lessons, {
      title: 'Minna no Nihongo 1',
      totalCards: minna1Cards.length,
      lessons: Array.from(minna1Lessons.keys()).sort((a, b) => a - b),
      jlptLevels: ['N5', 'N4']
    });
    
    await writeFiles('minna-2', minna2Lessons, {
      title: 'Minna no Nihongo 2',
      totalCards: minna2Cards.length,
      lessons: Array.from(minna2Lessons.keys()).sort((a, b) => a - b),
      jlptLevels: ['N4', 'N3']
    });
    
    // Generate master index
    const allCards = [...genkiCards, ...minnaCards];
    const masterIndex = {
      totalCards: allCards.length,
      textbooks: {
        'genki-1': {
          title: 'Genki 1',
          cardCount: genki1Cards.length,
          lessons: Array.from(genki1Lessons.keys()).sort((a, b) => a - b)
        },
        'genki-2': {
          title: 'Genki 2',
          cardCount: genki2Cards.length,
          lessons: Array.from(genki2Lessons.keys()).sort((a, b) => a - b)
        },
        'minna-1': {
          title: 'Minna no Nihongo 1',
          cardCount: minna1Cards.length,
          lessons: Array.from(minna1Lessons.keys()).sort((a, b) => a - b)
        },
        'minna-2': {
          title: 'Minna no Nihongo 2',
          cardCount: minna2Cards.length,
          lessons: Array.from(minna2Lessons.keys()).sort((a, b) => a - b)
        }
      },
      jlptDistribution: {
        N5: allCards.filter(c => c.jlptLevel === 'N5').length,
        N4: allCards.filter(c => c.jlptLevel === 'N4').length,
        N3: allCards.filter(c => c.jlptLevel === 'N3').length,
        N2: allCards.filter(c => c.jlptLevel === 'N2').length,
        N1: allCards.filter(c => c.jlptLevel === 'N1').length
      }
    };
    
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'index.json'),
      JSON.stringify(masterIndex, null, 2)
    );
    
    // Generate theme index
    console.log('\n🏷️  Generating theme index...');
    const themeIndex = await generateThemeIndex(allCards);
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'themes.json'),
      JSON.stringify(themeIndex, null, 2)
    );
    
    console.log('\n✅ Import complete!');
    console.log(`📁 Generated files in: ${OUTPUT_DIR}`);
    console.log(`📊 Total cards imported: ${allCards.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
main();
```

### 3. Add Import Script to package.json

```json
{
  "scripts": {
    "import:textbook-vocab": "tsx scripts/import-textbook-vocabulary.ts"
  }
}
```

### 4. Run the Import

```bash
npm run import:textbook-vocab
```

## Expected Output Structure

After running the import, you should have:

```
/src/data/textbook-vocabulary/
├── genki-1/
│   ├── metadata.json
│   ├── lesson-1.json
│   ├── lesson-2.json
│   └── ... (up to ~23 lessons)
├── genki-2/
│   ├── metadata.json
│   └── lesson-*.json files
├── minna-1/
│   ├── metadata.json
│   └── lesson-*.json files
├── minna-2/
│   ├── metadata.json
│   └── lesson-*.json files
├── index.json
└── themes.json
```

## Data Validation

### Sample Vocabulary Item
```json
{
  "id": "genki-1-1-12345",
  "japanese": "食べる",
  "reading": "たべる",
  "meaning": "to eat",
  "jlptLevel": "N5",
  "partOfSpeech": ["verb", "ichidan"],
  "examples": [
    {
      "japanese": "朝ご飯を食べます。",
      "reading": "あさごはんをたべます。",
      "english": "I eat breakfast."
    }
  ],
  "audioFile": null,
  "tags": ["lesson-3", "food", "daily-life"],
  "lesson": 3,
  "textbook": "genki-1"
}
```

### Validation Checklist
- [ ] All essential fields populated (japanese, meaning)
- [ ] Lesson numbers correctly extracted
- [ ] JLPT levels assigned where available
- [ ] Examples properly formatted
- [ ] No duplicate IDs
- [ ] Theme categorization working

## Audio File Handling

Audio files need separate handling:

1. **Extract Audio Paths** from MCP during import
2. **Download Audio Files** to `/public/audio/textbook-vocabulary/`
3. **Update JSON** with correct audio file paths
4. **Optimize Files** (convert to mp3, compress)

## Post-Import Tasks

1. **Verify Data Quality**
   - Check for missing fields
   - Validate lesson assignments
   - Ensure proper encoding (UTF-8)

2. **Optimize Bundle Size**
   - Minify JSON files
   - Consider splitting large lessons
   - Implement lazy loading

3. **Add to Git**
   ```bash
   git add src/data/textbook-vocabulary/
   git commit -m "feat: Add textbook vocabulary data from MCP import"
   ```

4. **Document Changes**
   - Update this guide with any issues
   - Note total file sizes
   - Record import date and MCP version

## Troubleshooting

### Common Issues

1. **MCP Connection Failed**
   - Ensure MCP server is running
   - Check port 8080 is not blocked
   - Verify localhost is accessible

2. **Missing Data Fields**
   - Some cards may lack readings or examples
   - Use fallbacks or skip incomplete cards
   - Log warnings for review

3. **Lesson Extraction Failed**
   - Manual mapping may be needed
   - Check deck naming conventions
   - Use tag analysis as backup

4. **Memory Issues**
   - Process in batches if needed
   - Use streaming for large datasets
   - Clear memory between textbooks

## Maintenance

### Updating Data
If vocabulary needs updates:
1. Modify import script as needed
2. Re-run import process
3. Validate changes
4. Commit updated files

### Adding New Textbooks
1. Ensure MCP has the deck data
2. Add to import script
3. Update type definitions
4. Run import and validate

## Security Considerations

- Never commit MCP server credentials
- Sanitize all imported text data
- Validate data types and ranges
- Remove any personal information
- Check for malicious content

This completes the data import process. The vocabulary is now part of your project and doesn't require MCP in production.