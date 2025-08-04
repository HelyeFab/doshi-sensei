import JSZip from 'jszip';

interface AnkiNote {
  id: string;
  guid: string;
  mid: string; // Model ID
  mod: number; // Modification time
  usn: number;
  tags: string;
  flds: string; // Fields separated by \x1f
  sfld: string; // Sort field
  csum: number;
  flags: number;
  data: string;
}

interface ProcessedAnkiCard {
  id: string;
  nid: string;
  did: string;
  ord: number;
  mod: number;
  type: number;
  queue: number;
  due: number;
  ivl: number;
  factor: number;
  reps: number;
  lapses: number;
  note: AnkiNote;
  front: string;
  back: string;
  modelName: string;
  tags: string[];
}

interface AnkiDeckInfo {
  id: string;
  name: string;
  desc?: string;
  lrnToday?: number[];
  revToday?: number[];
  newToday?: number[];
  timeToday?: number[];
}

export class AnkiParserBrowser {
  static async parseApkg(file: File): Promise<{
    cards: ProcessedAnkiCard[];
    decks: AnkiDeckInfo[];
    media: Map<string, Blob>;
  }> {
    try {
      console.log('=== AnkiParserBrowser - Optimized for Core 2000 ===');
      
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Extract collection.anki2
      const collectionFile = zipContent.files['collection.anki2'];
      if (!collectionFile) {
        throw new Error('No collection.anki2 file found');
      }
      
      const collectionData = await collectionFile.async('arraybuffer');
      
      // Initialize SQL.js
      const SQL = await this.initSQL();
      const db = new SQL.Database(new Uint8Array(collectionData));
      
      // Get collection info (contains decks and models)
      const colResult = db.exec('SELECT decks, models FROM col');
      const decksJson = colResult[0]?.values[0]?.[0] as string;
      const modelsJson = colResult[0]?.values[0]?.[1] as string;
      
      const decks = JSON.parse(decksJson || '{}');
      const models = JSON.parse(modelsJson || '{}');
      
      console.log('Models found:', Object.keys(models).map(id => ({
        id,
        name: models[id].name,
        fields: models[id].flds.map((f: any) => f.name)
      })));
      
      // Get ALL notes without limit
      const notesResult = db.exec('SELECT * FROM notes');
      const notes = this.parseQueryResult(notesResult[0]);
      console.log(`Found ${notes.length} notes`);
      
      // Get ALL cards without limit
      const cardsResult = db.exec('SELECT * FROM cards');
      const cards = this.parseQueryResult(cardsResult[0]);
      console.log(`Found ${cards.length} cards`);
      
      // Double-check we got all cards
      const cardCountResult = db.exec('SELECT COUNT(*) as count FROM cards');
      const totalCards = cardCountResult[0]?.values[0]?.[0];
      console.log(`Total cards in database: ${totalCards}`);
      
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
      
      // Process cards with intelligent field detection
      const processedCards = cards.map((card: any, index: number) => {
        const note = notes.find((n: any) => n.id === card.nid);
        if (!note) return null;
        
        const fields = note.flds.split('\x1f');
        const model = models[note.mid];
        
        // Debug logging for first few cards
        if (index < 5) {
          console.log(`\nCard ${index} (ID: ${card.id}):`, {
            noteId: note.id,
            modelId: note.mid,
            modelName: model?.name,
            fieldCount: fields.length,
            fieldNames: model?.flds?.map((f: any) => f.name) || [],
            fields: fields.map((f: string, i: number) => {
              const fieldName = model?.flds?.[i]?.name || `Field ${i}`;
              return `[${i}] ${fieldName}: ${f.substring(0, 100)}${f.length > 100 ? '...' : ''}`;
            })
          });
        }
        
        let front = '';
        let back = '';
        
        // Core 2000 specific detection
        if (model && model.name && model.name.toLowerCase().includes('core')) {
          console.log('Detected Core deck model');
          
          // For Core 2000, typically:
          // Field 0: Index number
          // Field 1: Expression (Japanese sentence)
          // Field 2: Reading
          // Field 3: Meaning (English)
          // Field 4: Audio
          // Field 5+: Additional info
          
          if (fields.length >= 4) {
            // Skip index field if it's just a number
            if (/^\d+$/.test(fields[0].trim())) {
              front = fields[1] || fields[2] || ''; // Expression or Reading
              back = fields[3] || fields[2] || ''; // Meaning
            } else {
              front = fields[0] || fields[1] || '';
              back = fields[2] || fields[3] || fields[1] || '';
            }
          }
        } else if (model && model.flds) {
          // Use field names to intelligently detect content
          const fieldNames = model.flds.map((f: any) => f.name.toLowerCase());
          
          // Find expression/sentence field for front
          let frontIndex = fieldNames.findIndex((name: string) => 
            name.includes('expression') || 
            name.includes('sentence') || 
            name.includes('japanese') ||
            name.includes('question') ||
            name === 'front'
          );
          
          // Find meaning/translation field for back
          let backIndex = fieldNames.findIndex((name: string) => 
            name.includes('meaning') || 
            name.includes('english') ||
            name.includes('translation') ||
            name.includes('definition') ||
            name === 'back'
          );
          
          // If we can't find specific fields, use defaults
          if (frontIndex === -1) frontIndex = 0;
          if (backIndex === -1) backIndex = Math.min(2, fields.length - 1);
          
          // Skip number fields
          if (/^\d+$/.test(fields[frontIndex]?.trim())) {
            frontIndex = Math.min(frontIndex + 1, fields.length - 1);
          }
          
          front = fields[frontIndex] || '';
          back = fields[backIndex] || '';
        } else {
          // Fallback: general heuristics
          if (fields.length >= 3 && /^\d+$/.test(fields[0].trim())) {
            // First field is a number, skip it
            front = fields[1] || '';
            back = fields[2] || '';
          } else if (fields.length >= 2) {
            front = fields[0] || '';
            back = fields[1] || '';
          } else {
            front = fields[0] || '';
            back = fields[0] || '';
          }
        }
        
        // Clean HTML
        front = this.cleanHtml(front);
        back = this.cleanHtml(back);
        
        return {
          ...card,
          note,
          front,
          back,
          modelName: model?.name || 'Unknown',
          tags: note.tags ? note.tags.split(' ').filter(Boolean) : []
        };
      }).filter(Boolean);
      
      // Log summary of processed cards
      console.log('\nProcessing summary:');
      console.log(`Total cards processed: ${processedCards.length}`);
      const sampleCards = processedCards.slice(0, 3);
      sampleCards.forEach((card, i) => {
        console.log(`Sample card ${i}:`, {
          front: card.front.substring(0, 50) + '...',
          back: card.back.substring(0, 50) + '...'
        });
      });
      
      db.close();
      
      const deckList = Object.entries(decks).map(([id, deck]) => ({
        id,
        name: (deck as any).name,
        ...(deck as any)
      }));
      
      return {
        cards: processedCards,
        decks: deckList,
        media
      };
    } catch (error) {
      console.error('Error parsing Anki package:', error);
      throw error;
    }
  }
  
  private static async initSQL() {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return '/sql-wasm.wasm';
        }
        return `/${file}`;
      }
    });
    
    // Ensure no query limits
    if (SQL.Database) {
      const originalExec = SQL.Database.prototype.exec;
      SQL.Database.prototype.exec = function(sql: string) {
        // Remove any LIMIT clause if present
        const unlimitedSql = sql.replace(/\s+LIMIT\s+\d+/gi, '');
        return originalExec.call(this, unlimitedSql);
      };
    }
    
    return SQL;
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
    
    // Preserve more HTML structure for rich content
    let cleaned = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Extract text content from ruby tags (furigana)
    cleaned = cleaned.replace(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/gi, '$1($2)');
    
    // Preserve audio references for later
    const audioMatches = cleaned.match(/\[sound:([^\]]+)\]/g) || [];
    if (audioMatches.length > 0) {
      console.log('Found audio references:', audioMatches);
    }
    
    // For now, remove sound tags but log them
    cleaned = cleaned.replace(/\[sound:[^\]]+\]/g, '[audio]');
    
    // Remove remaining HTML tags
    cleaned = cleaned.replace(/<\/?(div|p|span|b|i|u|strong|em|font)[^>]*>/gi, '');
    cleaned = cleaned.replace(/<img[^>]+>/g, '[image]');
    
    return cleaned.trim();
  }
}