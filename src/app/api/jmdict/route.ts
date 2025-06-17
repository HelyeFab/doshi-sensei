import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Helper function to read local JMdict files
async function readJMdictFile(filename: string): Promise<string> {
  try {
    const filePath = join(process.cwd(), 'public', 'dict', filename);
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading JMdict file ${filename}:`, error);
    throw new Error(`Failed to read JMdict file: ${filename}`);
  }
}

// Helper function to search in XML content
function searchInXMLContent(xmlContent: string, query: string, limit: number = 20): any[] {
  const results: any[] = [];
  const queryLower = query.toLowerCase();

  // Simple XML parsing for entries that contain the search term
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  let count = 0;

  while ((match = entryRegex.exec(xmlContent)) !== null && count < limit) {
    const entryXML = match[1];

    // Check if this entry contains our search term
    const containsQuery = entryXML.toLowerCase().includes(queryLower);

    if (containsQuery) {
      // Extract basic info from the entry
      const entSeqMatch = entryXML.match(/<ent_seq>(\d+)<\/ent_seq>/);
      const kebMatch = entryXML.match(/<keb>(.*?)<\/keb>/);
      const rebMatch = entryXML.match(/<reb>(.*?)<\/reb>/);
      const glossMatches = [...entryXML.matchAll(/<gloss>(.*?)<\/gloss>/g)];

      if (entSeqMatch && (kebMatch || rebMatch)) {
        const entry = {
          id: entSeqMatch[1],
          kanji: kebMatch ? kebMatch[1] : '',
          reading: rebMatch ? rebMatch[1] : '',
          meanings: glossMatches.map(m => m[1]),
          type: 'Unknown' // We could parse POS tags for more accuracy
        };

        results.push(entry);
        count++;
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');

    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
        }

        console.log(`API: Searching JMdict for "${query}"`);

        // Try to search in chunked files first
        const results: any[] = [];

        // Search through available chunk files
        for (let i = 0; i < 8; i++) {
          try {
            const chunkFilename = `chunks/chunk_${i.toString().padStart(3, '0')}.xml`;
            const chunkContent = await readJMdictFile(chunkFilename);
            const chunkResults = searchInXMLContent(chunkContent, query, limit - results.length);
            results.push(...chunkResults);

            if (results.length >= limit) {
              break;
            }
          } catch (error) {
            console.warn(`Failed to read chunk ${i}:`, error);
            continue;
          }
        }

        console.log(`API: Found ${results.length} results for "${query}"`);
        return NextResponse.json({ results, query, count: results.length });

      case 'chunks':
        // Return available chunk information
        try {
          const indexContent = await readJMdictFile('index.json');
          const indexData = JSON.parse(indexContent);
          return NextResponse.json({ chunks: indexData, success: true });
        } catch (error) {
          return NextResponse.json({
            chunks: { totalChunks: 8, entriesPerChunk: 2000 },
            success: true
          });
        }

      case 'test':
        // Health check endpoint
        try {
          // Test reading the first chunk
          const testContent = await readJMdictFile('chunks/chunk_000.xml');
          const hasContent = testContent.length > 100;

          return NextResponse.json({
            success: true,
            message: 'JMdict API is working',
            hasLocalData: hasContent,
            contentSize: testContent.length
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: 'JMdict local files not accessible',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('JMdict API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
