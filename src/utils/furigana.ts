interface FuriganaResponse {
  result: string;
  tokenCount: number;
  success: boolean;
}

interface FuriganaError {
  error: string;
  details?: string;
}

/**
 * Generate furigana for Japanese text using the Kuromoji tokenizer
 * @param text - Japanese text to process
 * @returns Promise with furigana-enhanced HTML string
 */
export async function generateFurigana(text: string): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      return text;
    }

    const response = await fetch('/api/furigana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      const errorData: FuriganaError = await response.json();
      console.error('Furigana API error:', errorData);

      // Fallback to original text if API fails
      return text;
    }

    const data: FuriganaResponse = await response.json();

    if (data.success && data.result) {
      return data.result;
    } else {
      console.warn('Furigana API returned no result, using original text');
      return text;
    }

  } catch (error) {
    console.error('Failed to generate furigana:', error);
    // Fallback to original text on any error
    return text;
  }
}

/**
 * Check if the furigana API is healthy and ready
 * @returns Promise with boolean indicating API health
 */
export async function checkFuriganaApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/furigana', {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';

  } catch (error) {
    console.error('Failed to check furigana API health:', error);
    return false;
  }
}

/**
 * Process multiple paragraphs with furigana
 * @param paragraphs - Array of text paragraphs
 * @returns Promise with array of furigana-enhanced paragraphs
 */
export async function generateFuriganaForParagraphs(paragraphs: string[]): Promise<string[]> {
  const results: string[] = [];

  // Process paragraphs in batches to avoid overwhelming the API
  const batchSize = 5;

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);

    const batchPromises = batch.map(paragraph => generateFurigana(paragraph));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

    // Small delay between batches to be nice to the server
    if (i + batchSize < paragraphs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Cache for furigana results to avoid repeated API calls
 */
class FuriganaCache {
  private cache = new Map<string, string>();
  private maxSize = 100;

  get(text: string): string | undefined {
    return this.cache.get(text);
  }

  set(text: string, result: string): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(text, result);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const furiganaCache = new FuriganaCache();

/**
 * Generate furigana with caching to improve performance
 * @param text - Japanese text to process
 * @returns Promise with furigana-enhanced HTML string
 */
export async function generateFuriganaWithCache(text: string): Promise<string> {
  const cached = furiganaCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const result = await generateFurigana(text);
  furiganaCache.set(text, result);

  return result;
}

/**
 * Clear the furigana cache
 */
export function clearFuriganaCache(): void {
  furiganaCache.clear();
}

/**
 * Get furigana cache statistics
 */
export function getFuriganaCacheStats(): { size: number; maxSize: number } {
  return {
    size: furiganaCache.size(),
    maxSize: 100
  };
}
