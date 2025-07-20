import { readAnkiPackage, readFromUrl } from 'anki-reader';
import { StudyList, SavedStudyItem, StudyItemType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import StudyListManager from './studyListManager';
import { auth } from '@/lib/firebase';
import { initializeAnkiReader } from '@/lib/anki/config';

export interface AnkiCard {
  id: string;
  deckId: string;
  deckName: string;
  front: string;
  back: string;
  tags: string[];
  type: number;
  due: number;
  interval: number;
  ease: number;
  reviews: number;
  lapses: number;
  media?: string[];
}

export interface AnkiDeck {
  id: string;
  name: string;
  cards: AnkiCard[];
  description?: string;
}

export interface ImportOptions {
  userId: string;
  onProgress?: (progress: number, message: string) => void;
}

export interface ImportResult {
  success: boolean;
  listId?: string;
  listName?: string;
  cardsImported?: number;
  error?: string;
}

export class AnkiImporter {
  private static MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

  /**
   * Parse an Anki package file (.apkg)
   */
  static async parsePackage(file: File): Promise<{ decks: AnkiDeck[], media: Map<string, Blob> }> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 200MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    try {
      // Initialize sql.js for anki-reader
      await initializeAnkiReader();
      const arrayBuffer = await file.arrayBuffer();
      const { collection, media } = await readAnkiPackage(new Uint8Array(arrayBuffer));
      
      const decks = new Map<string, AnkiDeck>();
      const mediaMap = new Map<string, Blob>();
      
      // Process media files
      if (media) {
        for (const [filename, data] of Object.entries(media)) {
          if (data instanceof Uint8Array) {
            mediaMap.set(filename, new Blob([data]));
          }
        }
      }
      
      // Get all decks
      const ankiDecks = collection.getDecks();
      
      for (const deck of ankiDecks) {
        const deckId = deck.getId();
        const deckName = deck.getName();
        
        if (!decks.has(deckId)) {
          decks.set(deckId, {
            id: deckId,
            name: deckName,
            cards: []
          });
        }
        
        // Get cards for this deck
        const cards = deck.getCards();
        
        for (const card of cards) {
          const note = card.getNote();
          const fields = note.getFields();
          
          // Extract front and back from fields
          // Anki typically uses first field as front, second as back
          const front = fields[0]?.getValue() || '';
          const back = fields[1]?.getValue() || '';
          
          // Get SRS data
          const cardData: AnkiCard = {
            id: card.getId(),
            deckId: deckId,
            deckName: deckName,
            front: this.cleanHtml(front),
            back: this.cleanHtml(back),
            tags: note.getTags() || [],
            type: card.getType(),
            due: card.getDue(),
            interval: card.getInterval(),
            ease: card.getFactor() / 1000, // Anki stores as int, we want float
            reviews: card.getReps(),
            lapses: card.getLapses(),
            media: this.extractMediaReferences(front + ' ' + back)
          };
          
          decks.get(deckId)!.cards.push(cardData);
        }
      }
      
      return { 
        decks: Array.from(decks.values()), 
        media: mediaMap 
      };
    } catch (error) {
      console.error('Error parsing Anki package:', error);
      throw new Error(`Failed to parse Anki package: ${error.message}`);
    }
  }

  /**
   * Clean HTML content from Anki cards
   */
  private static cleanHtml(html: string): string {
    // Remove HTML tags but preserve line breaks
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(div|p|span|b|i|u|strong|em)[^>]*>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Extract media file references from card content
   */
  private static extractMediaReferences(content: string): string[] {
    const mediaRefs: string[] = [];
    
    // Match [sound:filename.mp3] format
    const soundMatches = content.match(/\[sound:([^\]]+)\]/g) || [];
    for (const match of soundMatches) {
      const filename = match.replace(/\[sound:|]/g, '');
      mediaRefs.push(filename);
    }
    
    // Match <img src="filename.jpg"> format
    const imgMatches = content.match(/<img[^>]+src="([^"]+)"/g) || [];
    for (const match of imgMatches) {
      const filename = match.match(/src="([^"]+)"/)?.[1];
      if (filename && !filename.startsWith('http')) {
        mediaRefs.push(filename);
      }
    }
    
    return mediaRefs;
  }

  /**
   * Upload media files to Firebase Storage
   */
  private static async uploadMedia(
    media: Map<string, Blob>, 
    userId: string,
    deckName: string,
    onProgress?: (progress: number) => void
  ): Promise<Map<string, string>> {
    const uploadedUrls = new Map<string, string>();
    let uploaded = 0;
    
    for (const [filename, blob] of media) {
      try {
        const path = `users/${userId}/anki/${deckName}/${filename}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.set(filename, url);
        
        uploaded++;
        if (onProgress) {
          onProgress((uploaded / media.size) * 100);
        }
      } catch (error) {
        console.error(`Failed to upload media file ${filename}:`, error);
      }
    }
    
    return uploadedUrls;
  }

  /**
   * Convert Anki deck to study list
   */
  static async convertToStudyList(
    deck: AnkiDeck, 
    mediaUrls: Map<string, string>
  ): Promise<{ list: Partial<StudyList>, items: SavedStudyItem[] }> {
    const listId = uuidv4();
    const now = new Date();
    
    const list: Partial<StudyList> = {
      id: listId,
      name: `${deck.name} (Anki Import)`,
      description: `Imported from Anki on ${now.toLocaleDateString()}. Contains ${deck.cards.length} cards.`,
      type: 'flashcard',
      itemIds: [],
      createdAt: now,
      updatedAt: now,
      color: this.getRandomPastelColor(),
      metadata: {
        source: 'anki',
        originalDeckId: deck.id,
        originalDeckName: deck.name,
        cardCount: deck.cards.length,
        importDate: now,
        hasMedia: mediaUrls.size > 0
      }
    };
    
    const items: SavedStudyItem[] = [];
    
    for (const card of deck.cards) {
      const itemId = uuidv4();
      list.itemIds!.push(itemId);
      
      // Replace media references with Firebase URLs
      let processedFront = card.front;
      let processedBack = card.back;
      
      for (const mediaRef of card.media || []) {
        const url = mediaUrls.get(mediaRef);
        if (url) {
          // Replace sound references
          processedFront = processedFront.replace(`[sound:${mediaRef}]`, `<audio src="${url}" />`);
          processedBack = processedBack.replace(`[sound:${mediaRef}]`, `<audio src="${url}" />`);
          
          // Replace image references
          processedFront = processedFront.replace(`src="${mediaRef}"`, `src="${url}"`);
          processedBack = processedBack.replace(`src="${mediaRef}"`, `src="${url}"`);
        }
      }
      
      const item: SavedStudyItem = {
        id: itemId,
        itemType: 'anki_card' as StudyItemType,
        savedAt: now,
        listIds: [listId],
        ankiData: {
          originalId: card.id,
          deckName: card.deckName,
          cardType: 'basic', // TODO: Detect cloze and reverse cards
          front: processedFront,
          back: processedBack,
          tags: card.tags,
          media: card.media?.map(m => mediaUrls.get(m) || m) || [],
          
          // Preserve SRS data exactly
          srsData: {
            due: new Date(card.due * 1000), // Convert Unix timestamp
            interval: card.interval,
            ease: card.ease,
            reviews: card.reviews,
            lapses: card.lapses,
            lastReview: card.reviews > 0 ? new Date() : undefined
          }
        }
      };
      
      items.push(item);
    }
    
    return { list, items };
  }

  /**
   * Import a complete Anki deck
   */
  static async importDeck(
    file: File, 
    options: ImportOptions
  ): Promise<ImportResult> {
    try {
      const { onProgress, userId } = options;
      
      // Step 1: Parse the package
      if (onProgress) onProgress(10, 'Parsing Anki package...');
      const { decks, media } = await this.parsePackage(file);
      
      if (decks.length === 0) {
        return { success: false, error: 'No decks found in the package' };
      }
      
      // For now, import only the first deck
      // TODO: Handle multiple decks
      const deck = decks[0];
      
      // Step 2: Upload media files
      if (media.size > 0 && onProgress) {
        onProgress(30, `Uploading ${media.size} media files...`);
      }
      
      const mediaUrls = await this.uploadMedia(
        media, 
        userId, 
        deck.name,
        (progress) => {
          if (onProgress) {
            // Media upload is 30-70% of total progress
            onProgress(30 + (progress * 0.4), `Uploading media files...`);
          }
        }
      );
      
      // Step 3: Convert to study list
      if (onProgress) onProgress(70, 'Creating study list...');
      const { list, items } = await this.convertToStudyList(deck, mediaUrls);
      
      // Step 4: Save to database
      if (onProgress) onProgress(90, 'Saving to database...');
      
      // Create the study list
      const createdList = await StudyListManager.createStudyList(
        list.name!,
        'flashcard', // Always flashcard type for Anki imports
        list.description
      );
      
      // Save all items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Update item with the actual list ID
        item.listIds = [createdList.id];
        
        // Save the item
        await StudyListManager.saveItem(item);
        
        // Update progress
        if (onProgress && i % 10 === 0) {
          const saveProgress = 90 + (i / items.length) * 10;
          onProgress(saveProgress, `Saving cards... (${i}/${items.length})`);
        }
      }
      
      // Update list metadata
      createdList.metadata = list.metadata;
      await StudyListManager.updateListMetadata(createdList.id, createdList.metadata);
      
      if (onProgress) onProgress(100, 'Import complete!');
      
      return {
        success: true,
        listId: createdList.id,
        listName: createdList.name,
        cardsImported: items.length
      };
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a random pastel color for the list
   */
  private static getRandomPastelColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
  }
}