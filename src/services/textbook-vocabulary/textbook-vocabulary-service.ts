/**
 * Textbook Vocabulary Service
 * Mock implementation for testing
 */

export class TextbookVocabularyService {
  private static instance: TextbookVocabularyService;
  
  static getInstance(): TextbookVocabularyService {
    if (!TextbookVocabularyService.instance) {
      TextbookVocabularyService.instance = new TextbookVocabularyService();
    }
    return TextbookVocabularyService.instance;
  }
  
  async getDueCards(textbooks?: string[]): Promise<any[]> {
    // Mock implementation
    return [];
  }
  
  async getCardById(id: string): Promise<any | null> {
    // Mock implementation
    return null;
  }
  
  async searchCards(query: string): Promise<any[]> {
    // Mock implementation
    return [];
  }
  
  async processReview(cardId: string, rating: number): Promise<void> {
    // Mock implementation
  }
  
  async getStats(): Promise<any> {
    // Mock implementation
    return {
      totalCards: 0,
      dueCards: 0,
      learnedCards: 0,
      accuracy: 0
    };
  }
}