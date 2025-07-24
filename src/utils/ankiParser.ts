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

// Version 2 - Core 2000 field detection update
export class SimpleAnkiParser {
  static async parseApkg(file: File): Promise<{
    cards: any[];
    decks: any[];
    media: Map<string, Blob>;
  }> {
    try {
      console.log('=== SimpleAnkiParser V2 - Core 2000 Field Detection ===');
      console.log('Loading JSZip...');
      const zip = new JSZip();
      
      console.log('Loading zip file...');
      const zipContent = await zip.loadAsync(file);
      
      console.log('Files in zip:', Object.keys(zipContent.files));
      
      // Extract collection.anki2
      const collectionFile = zipContent.files['collection.anki2'];
      if (!collectionFile) {
        throw new Error('No collection.anki2 file found in the package');
      }
      
      console.log('Extracting collection.anki2...');
      const collectionData = await collectionFile.async('arraybuffer');
      
      // Initialize SQL.js
      console.log('Initializing SQL.js...');
      const SQL = await this.initSQL();
      
      // Load the database
      console.log('Loading Anki database...');
      const db = new SQL.Database(new Uint8Array(collectionData));
      
      // Query cards
      console.log('Querying cards...');
      const cardsResult = db.exec('SELECT * FROM cards');
      console.log('Cards query result:', cardsResult.length > 0 ? `Found ${cardsResult[0].values.length} cards` : 'No cards found');
      
      // Query notes
      console.log('Querying notes...');
      const notesResult = db.exec('SELECT * FROM notes');
      console.log('Notes query result:', notesResult.length > 0 ? `Found ${notesResult[0].values.length} notes` : 'No notes found');
      
      // Query decks
      console.log('Querying decks...');
      const decksResult = db.exec('SELECT decks FROM col');
      console.log('Decks query result:', decksResult.length > 0 ? 'Found decks' : 'No decks found');
      
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
          console.warn('Failed to parse media:', e);
        }
      }
      
      // Parse results
      const cards = this.parseQueryResult(cardsResult[0]);
      const notes = this.parseQueryResult(notesResult[0]);
      const decksJson = decksResult[0]?.values[0]?.[0];
      const decks = decksJson ? JSON.parse(decksJson as string) : {};
      
      console.log('Parsed:', { 
        cardsCount: cards.length, 
        notesCount: notes.length,
        decksCount: Object.keys(decks).length,
        mediaCount: media.size 
      });
      
      // Combine cards with notes
      const fullCards = cards.map((card, index) => {
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
        decks: Object.entries(decks).map(([id, deck]: [string, any]) => ({
          id,
          name: deck.name,
          ...deck
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
  
  private static parseQueryResult(result: any): any[] {
    if (!result) return [];
    
    const { columns, values } = result;
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }
}