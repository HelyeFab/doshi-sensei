import JSZip from 'jszip';

interface AnkiNote {
  id: string;
  fields: string[];
  tags: string[];
}

interface AnkiCard {
  id: string;
  nid: string; // Note ID
  did: string; // Deck ID
  ord: number; // Card order
  mod: number; // Modification time
  type: number;
  queue: number;
  due: number;
  ivl: number; // Interval
  factor: number; // Ease factor
  reps: number; // Number of reviews
  lapses: number;
}

interface AnkiDeck {
  id: string;
  name: string;
  desc?: string;
  lrnToday?: number[];
  revToday?: number[];
  newToday?: number[];
  timeToday?: number[];
}

interface ParsedCard extends AnkiCard {
  note: ParsedNote | null;
  front: string;
  back: string;
}

interface ParsedNote {
  id: string;
  guid?: string;
  mid?: string;
  mod?: number;
  usn?: number;
  tags?: string;
  flds?: string;
  sfld?: string;
  csum?: number;
  flags?: number;
  data?: string;
}

interface SQLQueryResult {
  columns: string[];
  values: any[][];
}

// Version 2 - Core 2000 field detection update
export class SimpleAnkiParser {
  static async parseApkg(file: File): Promise<{
    cards: ParsedCard[];
    decks: AnkiDeck[];
    media: Map<string, Blob>;
  }> {
    try {

      const zip = new JSZip();

      const zipContent = await zip.loadAsync(file);
      
      console.log('Files in zip:', Object.keys(zipContent.files));
      
      // Extract collection.anki2
      const collectionFile = zipContent.files['collection.anki2'];
      if (!collectionFile) {
        throw new Error('No collection.anki2 file found in the package');
      }

      const collectionData = await collectionFile.async('arraybuffer');
      
      // Initialize SQL.js

      const SQL = await this.initSQL();
      
      // Load the database

      const db = new SQL.Database(new Uint8Array(collectionData));
      
      // Query cards

      const cardsResult = db.exec('SELECT * FROM cards');

      // Query notes

      const notesResult = db.exec('SELECT * FROM notes');

      // Query decks

      const decksResult = db.exec('SELECT decks FROM col');

      // Process media
      const media = new Map<string, Blob>();
      const mediaFile = zipContent.files['media'];
      if (mediaFile) {
        try {
          const mediaJson = await mediaFile.async('string');
          const mediaMap = JSON.parse(mediaJson);
          
          for (const [idx, filename] of Object.entries(mediaMap)) {
            const mediaFileInZip = zipContent.files[idx];
            if (mediaFileInZip) {
              const blob = await mediaFileInZip.async('blob');
              media.set(filename as string, blob);
            }
          }
        } catch (e) {

        }
      }
      
      // Parse results
      const cards = this.parseQueryResult(cardsResult[0]) as AnkiCard[];
      const notes = this.parseQueryResult(notesResult[0]) as ParsedNote[];
      const decksJson = decksResult[0]?.values[0]?.[0];
      const decks = decksJson ? JSON.parse(decksJson as string) : {};
      
      console.log('Parsed:', { 
        cardsCount: cards.length, 
        notesCount: notes.length,
        decksCount: Object.keys(decks).length,
        mediaCount: media.size 
      });
      
      // Combine cards with notes
      const fullCards: ParsedCard[] = cards.map((card, index) => {
        const note = notes.find(n => n.id === card.nid);
        
        // For debugging: log the first few cards to see field structure
        if (index < 5 && note?.flds) {
          const fields = note.flds.split('\x1f');
          console.log(`Card ${index} fields:`, {
            totalFields: fields.length,
            fields: fields.map((f, i) => `[${i}]: ${f.substring(0, 50)}${f.length > 50 ? '...' : ''}`),
            rawFlds: note.flds.substring(0, 200)
          });
        }
        
        // Core 2000 typically has these fields:
        // [0] = Expression/Sentence
        // [1] = Reading
        // [2] = Meaning
        // [3] = Audio
        // [4] = Notes/Other
        const fields = note?.flds?.split('\x1f') || [];
        
        // Try to intelligently detect which fields to use
        let front = '';
        let back = '';
        
        if (fields.length >= 3) {
          // Likely Core 2000 or similar multi-field deck
          // Use Expression/Sentence as front, Meaning as back
          front = fields[0] || fields[1] || '';
          back = fields[2] || fields[1] || '';
        } else if (fields.length === 2) {
          // Simple two-field deck
          front = fields[0] || '';
          back = fields[1] || '';
        } else if (fields.length === 1) {
          // Single field - might be a cloze card
          front = fields[0] || '';
          back = fields[0] || '';
        }
        
        return {
          ...card,
          note: note || null,
          front,
          back
        };
      });
      
      db.close();
      
      return {
        cards: fullCards,
        decks: Object.entries(decks).map(([id, deck]) => ({
          id,
          name: (deck as AnkiDeck).name,
          ...(deck as AnkiDeck)
        })),
        media
      };
    } catch (error) {
      console.error('Error parsing Anki package:', error);
      throw error;
    }
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
  
  private static parseQueryResult(result: SQLQueryResult | undefined): Record<string, any>[] {
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
}