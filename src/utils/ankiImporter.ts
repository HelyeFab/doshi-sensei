import { StudyList, SavedStudyItem, StudyItemType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import StudyListManager from './studyListManager';
import { auth } from '@/lib/firebase';
// import { SimpleAnkiParser } from './ankiParser';
// import { AnkiParserV2 } from './ankiParserV2';
// import { AnkiParserBrowser } from './ankiParserBrowser';
// import { AnkiParserApkgReader } from './ankiParserApkgReader';
import { AnkiParserGenesis } from './ankiParserGenesis';
import { AnkiMediaStore } from './ankiMediaStore';

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
  fields?: string[];  // Add fields to preserve all original Anki data
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
      console.log('Starting Anki package parsing...', { fileName: file.name, fileSize: file.size });
      
      // Use anki-apkg-parser library as requested
      console.log('Using AnkiParserGenesis with anki-apkg-parser library...');
      const parseResult = await AnkiParserGenesis.parseApkg(file);
      
      console.log('Package parsed successfully:', {
        cards: parseResult.cards.length,
        decks: parseResult.decks.length,
        media: parseResult.media.size
      });
      
      const decks = new Map<string, AnkiDeck>();
      const mediaMap = parseResult.media;
      
      // Process decks and cards
      for (const deck of parseResult.decks) {
        const deckId = deck.id;
        const deckName = deck.name;
        
        if (!decks.has(deckId)) {
          decks.set(deckId, {
            id: deckId,
            name: deckName,
            cards: []
          });
        }
      }
      
      // Process cards
      console.log(`Processing ${parseResult.cards.length} cards...`);
      
      for (const card of parseResult.cards) {
        const deckId = card.did || '1'; // Default deck ID if not found
        
        // Debug first few cards
        if (decks.size === 0 || Array.from(decks.values()).every(d => d.cards.length < 3)) {
          console.log('Card sample:', {
            id: card.id,
            did: card.did,
            nid: card.nid,
            front: card.front?.substring(0, 50),
            back: card.back?.substring(0, 50),
            hasNote: !!card.note,
            noteFields: card.note?.flds?.substring(0, 100)
          });
        }
        
        // Ensure deck exists
        if (!decks.has(deckId)) {
          decks.set(deckId, {
            id: deckId,
            name: 'Default',
            cards: []
          });
        }
        
        // Get deck name
        const deckName = decks.get(deckId)?.name || 'Default';
        
        // Use the front and back fields that were intelligently detected by the parser
        const front = card.front || '';
        const back = card.back || '';
        
        // Log card content for debugging
        if (decks.size === 0 || Array.from(decks.values()).every(d => d.cards.length < 5)) {
          console.log(`Card ${card.id} content:`, {
            front: front.substring(0, 100),
            back: back.substring(0, 100)
          });
        }
        
        // Get SRS data
        const cardData: AnkiCard = {
          id: card.id,
          deckId: deckId,
          deckName: deckName,
          front: front,  // Keep HTML intact!
          back: back,    // Keep HTML intact!
          tags: card.note?.tags || [],
          type: card.type || 0,
          due: card.due || 0,
          interval: card.ivl || 0,
          ease: (card.factor || 2500) / 1000, // Anki stores as int, we want float
          reviews: card.reps || 0,
          lapses: card.lapses || 0,
          media: this.extractMediaReferences(front + ' ' + back),
          fields: card.fields || []  // Preserve all original fields
        };
        
        decks.get(deckId)!.cards.push(cardData);
      }
      
      // Filter out empty decks and log deck info
      const nonEmptyDecks = Array.from(decks.values()).filter(deck => deck.cards.length > 0);
      
      console.log('Deck processing complete:', {
        totalDecks: decks.size,
        nonEmptyDecks: nonEmptyDecks.length,
        deckInfo: Array.from(decks.values()).map(d => ({
          id: d.id,
          name: d.name,
          cards: d.cards.length
        }))
      });
      
      return { 
        decks: nonEmptyDecks, 
        media: mediaMap 
      };
    } catch (error) {
      console.error('Error parsing Anki package:', error);
      throw new Error(`Failed to parse Anki package: ${error.message}`);
    }
  }

  /**
   * Clean HTML content from Anki cards - DEPRECATED
   * We now preserve HTML for rich content display
   */
  private static cleanHtml(html: string): string {
    // Only decode HTML entities, preserve all tags
    return html
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
   * Upload media files to Firebase Storage - DEPRECATED
   * We now store media locally as blob URLs to keep decks local-only
   */
  private static async uploadMedia(
    media: Map<string, Blob>, 
    userId: string,
    deckName: string,
    onProgress?: (progress: number) => void
  ): Promise<Map<string, string>> {
    console.warn('uploadMedia is deprecated. Media is now stored locally as blob URLs.');
    return new Map<string, string>();
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
          // Replace sound references with proper audio tag
          processedFront = processedFront.replace(`[sound:${mediaRef}]`, `<audio controls src="${url}" class="anki-audio" />`);
          processedBack = processedBack.replace(`[sound:${mediaRef}]`, `<audio controls src="${url}" class="anki-audio" />`);
          
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
          // IMPORTANT: Store ALL original fields to preserve rich content
          fields: card.fields || [],
          // Store raw front/back before processing
          rawFront: card.front,
          rawBack: card.back,
          
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
      
      console.log('Selected deck for import:', {
        deckName: deck.name,
        deckId: deck.id,
        cardCount: deck.cards.length
      });
      
      if (deck.cards.length === 0) {
        return { success: false, error: 'Selected deck has no cards' };
      }
      
      // Step 2: Process media files locally (no cloud upload)
      const mediaUrls = new Map<string, string>();
      
      if (media.size > 0) {
        // Store media in IndexedDB for persistent local storage
        console.log(`Processing ${media.size} media files locally...`);
        if (onProgress) onProgress(30, `Processing ${media.size} media files...`);
        
        // Get AnkiMediaStore instance
        const mediaStore = AnkiMediaStore.getInstance();
        
        // Store media blobs in IndexedDB and get persistent URLs
        let processed = 0;
        for (const [filename, blob] of media) {
          try {
            // Store in IndexedDB and get a blob URL
            const blobUrl = await mediaStore.storeMedia(filename, blob);
            mediaUrls.set(filename, blobUrl);
            
            processed++;
            if (onProgress) {
              onProgress(30 + ((processed / media.size) * 40), `Processing media files...`);
            }
          } catch (error) {
            console.warn(`Failed to process media file ${filename}:`, error);
          }
        }
        
        console.log(`Processed ${processed} media files with persistent local storage`);
      }
      
      // Step 3: Convert to study list
      if (onProgress) onProgress(70, 'Creating study list...');
      const { list, items } = await this.convertToStudyList(deck, mediaUrls);
      
      // Step 4: Save to database
      if (onProgress) onProgress(90, 'Saving to database...');
      
      // Create the study list - pass user and subscription info
      const user = auth.currentUser;
      const createdList = await StudyListManager.createStudyList(
        list.name!,
        'flashcard', // Always flashcard type for Anki imports
        list.description,
        user,
        'monthly' // Premium users can import
      );
      
      // Save all items in batches to improve performance
      console.log(`Saving ${items.length} items to list ${createdList.id}`);
      
      // Debug: Check total items in localStorage before saving
      const existingItems = await StudyListManager.getSavedStudyItems();
      console.log(`Existing items in storage before save: ${existingItems.length}`);
      
      // Update all items with the actual list ID first
      for (const item of items) {
        item.listIds = [createdList.id];
      }
      
      // Save all items at once using StudyListManager's batch save
      try {
        console.log(`Attempting to save all ${items.length} items at once...`);
        const savedItems = await StudyListManager.getSavedStudyItems();
        
        // Add all new items to existing items
        const allItems = [...savedItems, ...items];
        
        // Save all items to storage
        await StudyListManager['saveSavedStudyItemsToStorage'](allItems);
        
        // Update the list to include all item IDs
        const lists = await StudyListManager.getAllStudyLists();
        const listIndex = lists.findIndex(l => l.id === createdList.id);
        if (listIndex >= 0) {
          lists[listIndex].itemIds = items.map(item => item.id);
          lists[listIndex].updatedAt = new Date();
          await StudyListManager['saveStudyListsToStorage'](lists);
        }
        
        console.log(`Successfully saved all ${items.length} items`);
        
        // Verify the save
        const finalItems = await StudyListManager.getSavedStudyItems();
        console.log(`Total items in storage after save: ${finalItems.length}`);
        
        if (onProgress) {
          onProgress(100, `Saved all ${items.length} cards successfully`);
        }
      } catch (saveError) {
        console.error('Failed to save items:', saveError);
        
        // Fallback to batch saving if bulk save fails
        const BATCH_SIZE = 50;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, Math.min(i + BATCH_SIZE, items.length));
          
          try {
            // Save items in parallel within batch
            await Promise.all(batch.map(async (item) => {
              // Save the item
              await StudyListManager.saveItem(item);
            }));
            
            // Update progress
            if (onProgress) {
              const itemsSaved = Math.min(i + BATCH_SIZE, items.length);
              const saveProgress = 90 + (itemsSaved / items.length) * 10;
              onProgress(saveProgress, `Saving cards... (${itemsSaved}/${items.length})`);
            }
          } catch (batchError) {
            console.error(`Failed to save batch starting at ${i}:`, batchError);
            // Try to save items individually if batch fails
            for (const item of batch) {
              try {
                await StudyListManager.saveItem(item);
              } catch (individualError) {
                console.error(`Failed to save individual item:`, individualError);
              }
            }
          }
        }
      }
      
      console.log('All items saved successfully');
      
      // Debug: Check total items after saving
      const finalItems = await StudyListManager.getSavedStudyItems();
      const listItemsOnly = finalItems.filter(item => item.listIds.includes(createdList.id));
      console.log(`Total items in localStorage after save: ${finalItems.length}`);
      console.log(`Items in this list after save: ${listItemsOnly.length}`);
      
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