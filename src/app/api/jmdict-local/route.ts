import { NextRequest, NextResponse } from 'next/server';
import { JapaneseWord } from '@/types';
import {
  parseJMdictXML,
  convertToJapaneseWord,
  searchJMdictEntries,
  type JMdictEntry
} from '@/utils/jmdictParser';
import { promises as fs } from 'fs';
import path from 'path';

// Cache for parsed JMdict entries (local development only)
let cachedEntries: JMdictEntry[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadJMdictEntries(chunkSize: number = 300000): Promise<JMdictEntry[]> {
  try {
    // Check if we have cached entries that are still valid
    const now = Date.now();
    if (cachedEntries && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Using cached JMdict entries');
      return cachedEntries;
    }

    console.log('Loading JMdict entries from file...');
    const filePath = path.join(process.cwd(), 'src', 'dict', 'JMdict_e_examp');

    // Read the file
    const content = await fs.readFile(filePath, 'utf-8');

    // Take a chunk for processing (adjust size based on performance needs)
    const chunk = content.substring(0, chunkSize);

    // Parse entries (limit to reasonable number for local testing)
    const entries = parseJMdictXML(chunk, 1000); // Increased limit for more entries

    // Cache the results
    cachedEntries = entries;
    cacheTimestamp = now;

    console.log(`Loaded and cached ${entries.length} JMdict entries from real file`);
    return entries;
  } catch (error) {
    console.error('Error loading JMdict entries:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    switch (action) {
      case 'test':
        // Test the parser functionality with real data
        const testEntries = await loadJMdictEntries(200000); // 200KB for quick test
        return NextResponse.json({
          success: true,
          message: `JMdict XML parser working! Loaded ${testEntries.length} REAL entries from actual JMdict file.`,
          sampleEntries: testEntries.slice(0, 3).map((entry, index) =>
            convertToJapaneseWord(entry, index)
          )
        });

      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
        }

        // Load entries and search with real data
        const allEntries = await loadJMdictEntries();
        const matchingEntries = searchJMdictEntries(allEntries, query, limit);

        // Convert to JapaneseWord format
        const results = matchingEntries.map((entry, index) =>
          convertToJapaneseWord(entry, index)
        );

        return NextResponse.json({
          query,
          results,
          count: results.length,
          source: 'JMdict XML (REAL DATA - Local Development)'
        });

      case 'stats':
        const statsEntries = await loadJMdictEntries();
        const stats = {
          totalEntries: statsEntries.length,
          entriesWithKanji: statsEntries.filter(e => e.kanji.length > 0).length,
          entriesWithReadings: statsEntries.filter(e => e.readings.length > 0).length,
          averageSensesPerEntry: statsEntries.reduce((acc, e) => acc + e.senses.length, 0) / statsEntries.length,
          cacheStatus: cachedEntries ? 'cached' : 'not cached',
          cacheAge: cachedEntries ? Math.round((Date.now() - cacheTimestamp) / 1000) : 0,
          chunkInfo: 'Processing 300KB chunk of 66MB JMdict file for local testing'
        };

        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: 'Invalid action. Use: test, search, or stats' }, { status: 400 });
    }
  } catch (error) {
    console.error('JMdict Local API error:', error);
    return NextResponse.json({
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
