import { Unpack, Deck } from 'anki-apkg-parser';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally in browser
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

interface ParsedAnkiNote {
  id: string;
  fields: string[];
  tags: string[];
  deckName: string;
}

interface ProcessedCard {
  id: string;
  noteId: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
  fields: string[];
}

interface AnkiDeckInfo {
  id: string;
  name: string;
  desc: string;
  cards: ProcessedCard[];
}

interface MediaFile {
  filename: string;
  data: Uint8Array;
}

interface DeckMeta {
  name: string;
}

interface ParsedDeck {
  meta?: DeckMeta;
  notes: Array<{
    id: string;
    guid?: string;
    modelId?: string;
    fields: string[];
    tags: string[];
  }>;
  mediaFiles?: MediaFile[];
}

export class AnkiParserGenesis {
  static async parseApkg(file: File): Promise<{
    cards: ProcessedCard[];
    decks: AnkiDeckInfo[];
    media: Map<string, Blob>;
  }> {
    try {

      // Convert File to Buffer as shown in your example
      const buffer = await file.arrayBuffer();
      const deckBuffer = Buffer.from(buffer);
      
      // Create a temporary in-memory representation
      // Since we can't use filesystem in browser, we'll work with the data directly
      const deck = await this.parseInMemory(deckBuffer);

      // Map notes to our card structure as shown in your example
      const mappedNotes: ParsedAnkiNote[] = deck.notes.map((note) => ({
        id: note.id,
        fields: note.fields,
        tags: note.tags,
        deckName: deck.meta?.name || 'Imported Deck'
      }));
      
      // Debug: Log first few notes

      mappedNotes.slice(0, 5).forEach((note, idx) => {
        console.log(`Note ${idx}:`, {
          id: note.id,
          fieldCount: note.fields?.length || 0,
          fields: note.fields?.map((f: string, i: number) => 
            `[${i}]: ${f.substring(0, 100)}${f.length > 100 ? '...' : ''}`
          ),
          tags: note.tags
        });
      });
      
      // Process cards
      const processedCards: ProcessedCard[] = mappedNotes.map((note) => {
        const fields = note.fields || [];
        let front = '';
        let back = '';
        
        // Core 2000 detection - if first field is a number, skip it
        if (fields.length >= 4 && /^\d+$/.test(fields[0]?.trim())) {
          // Core 2000: [index, expression, reading, meaning, ...]
          front = fields[1] || ''; // Expression
          back = fields[3] || ''; // Meaning
        } else if (fields.length >= 2) {
          front = fields[0] || '';
          back = fields[1] || '';
        } else if (fields.length === 1) {
          front = fields[0] || '';
          back = fields[0] || '';
        }
        
        return {
          id: note.id,
          noteId: note.id,
          deckId: '1',
          front: this.cleanHtml(front),
          back: this.cleanHtml(back),
          tags: note.tags || [],
          fields: note.fields
        };
      });

      // Process media
      const media = new Map<string, Blob>();
      if (deck.mediaFiles && Array.isArray(deck.mediaFiles)) {
        deck.mediaFiles.forEach((mediaFile) => {
          if (mediaFile.data) {
            media.set(mediaFile.filename, new Blob([mediaFile.data]));
          }
        });
      }
      
      // Create deck info
      const decks = [{
        id: '1',
        name: deck.meta?.name || 'Imported Deck',
        desc: '',
        cards: processedCards
      }];
      
      return {
        cards: processedCards,
        decks,
        media
      };
    } catch (error) {
      console.error('Error parsing with anki-apkg-parser:', error);
      throw error;
    }
  }
  
  // Parse in memory without filesystem
  private static async parseInMemory(buffer: Buffer): Promise<ParsedDeck> {
    // Since anki-apkg-parser requires filesystem, we'll use a different approach
    // We'll parse the APKG structure directly
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Load the zip content
    const zipContent = await zip.loadAsync(buffer);
    
    // Extract collection.anki2
    const collectionFile = zipContent.files['collection.anki2'];
    if (!collectionFile) {
      throw new Error('No collection.anki2 file found');
    }
    
    const collectionData = await collectionFile.async('arraybuffer');
    
    // Initialize SQL.js to read the SQLite database
    const SQL = await this.initSQL();
    const db = new SQL.Database(new Uint8Array(collectionData));
    
    // Get collection info
    const colResult = db.exec('SELECT decks, models FROM col');
    const decksJson = colResult[0]?.values[0]?.[0] as string;
    const modelsJson = colResult[0]?.values[0]?.[1] as string;
    
    const decks = JSON.parse(decksJson || '{}');
    const models = JSON.parse(modelsJson || '{}');
    
    // Debug: Check what's in the notes table

    // First, count total notes
    const countResult = db.exec('SELECT COUNT(*) as total FROM notes');
    const totalNotes = countResult[0]?.values[0]?.[0];

    // Try different queries to debug

    // Query 1: Simple SELECT *
    const query1 = db.exec('SELECT * FROM notes');

    // Query 2: With explicit columns
    const query2 = db.exec('SELECT id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data FROM notes');

    // Query 3: Just get IDs to see if it's a data size issue
    const query3 = db.exec('SELECT id FROM notes');

    // Use the explicit column query
    const notesResult = query2;
    let notesData = this.parseQueryResult(notesResult[0]);

    // If we're only getting 41, let's see what's special about row 41/42
    if (notesData.length <= 50) {

      // Try paginated queries

      let offset = 0;
      let allNotes = [];
      let hasMore = true;
      
      while (hasMore) {
        const pageQuery = db.exec(`SELECT * FROM notes LIMIT 100 OFFSET ${offset}`);
        const pageData = pageQuery[0]?.values || [];

        if (pageData.length === 0) {
          hasMore = false;
        } else {
          allNotes = allNotes.concat(pageData);
          offset += pageData.length;
        }
        
        // Safety limit
        if (offset > 10000) break;
      }

      // If pagination works, use that data instead
      if (allNotes.length > notesData.length) {

        notesData = allNotes.map((row) => {
          const obj: Record<string, any> = {};
          notesResult[0].columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        });
      }
    }
    
    // Map notes to the format expected by your code
    const notes = notesData.map((noteRow) => {
      const fields = noteRow.flds ? noteRow.flds.split('\x1f') : [];
      const tags = noteRow.tags ? noteRow.tags.split(' ').filter(Boolean) : [];
      
      return {
        id: noteRow.id,
        guid: noteRow.guid,
        modelId: noteRow.mid,
        fields,
        tags
      };
    });
    
    // Get deck metadata
    const deckEntries = Object.entries(decks);
    const mainDeck = deckEntries.length > 0 ? deckEntries[0][1] : { name: 'Imported Deck' };
    
    // Process media
    const mediaFiles: MediaFile[] = [];
    const mediaFile = zipContent.files['media'];
    if (mediaFile) {
      try {
        const mediaJson = await mediaFile.async('string');
        const mediaMap = JSON.parse(mediaJson);
        
        for (const [idx, filename] of Object.entries(mediaMap)) {
          const mediaFileInZip = zipContent.files[idx];
          if (mediaFileInZip) {
            const data = await mediaFileInZip.async('uint8array');
            mediaFiles.push({ filename, data });
          }
        }
      } catch (e) {

      }
    }
    
    db.close();
    
    return {
      meta: {
        name: (mainDeck as Record<string, any>).name || 'Imported Deck'
      },
      notes,
      mediaFiles
    };
  }
  
  private static async initSQL() {
    const initSqlJs = (await import('sql.js')).default;
    return await initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return '/sql-wasm.wasm';
        }
        return `/${file}`;
      }
    });
  }
  
  private static parseQueryResult(result: { columns: string[]; values: any[][] } | undefined): Record<string, any>[] {
    if (!result) return [];
    
    const { columns, values } = result;
    return values.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }
  
  private static cleanHtml(html: string): string {
    if (!html) return '';
    
    let cleaned = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Extract furigana
    cleaned = cleaned.replace(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/gi, '$1($2)');
    
    // Keep track of media
    const audioMatches = cleaned.match(/\[sound:([^\]]+)\]/g) || [];
    if (audioMatches.length > 0) {

    }
    
    // Clean remaining HTML
    cleaned = cleaned.replace(/\[sound:[^\]]+\]/g, '[audio]');
    cleaned = cleaned.replace(/<\/?(div|p|span|b|i|u|strong|em|font)[^>]*>/gi, '');
    cleaned = cleaned.replace(/<img[^>]+>/g, '[image]');
    
    return cleaned.trim();
  }
}