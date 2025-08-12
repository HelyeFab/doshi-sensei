import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

interface Article {
  id: string;
  title: string;
  content: string;
  image?: string;
  jlptLevel?: string;
  source: string;
  publishedAt: Timestamp;
  qualityScore?: number;
  aiValidated?: boolean;
  aiEnhanced?: boolean;
  validationResults?: {
    qualityScore: number;
    jlptLevel: string;
    issues: string[];
    suggestions: string[];
    contentStructure: {
      hasProperIntroduction: boolean;
      hasProperBody: boolean;
      hasProperConclusion: boolean;
      isComplete: boolean;
    };
  };
}

export class ArticlePostProcessor {
  private static instance: ArticlePostProcessor;
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ArticlePostProcessor {
    if (!ArticlePostProcessor.instance) {
      ArticlePostProcessor.instance = new ArticlePostProcessor();
    }
    return ArticlePostProcessor.instance;
  }

  /**
   * Start the background processing of unvalidated articles
   * This should be called once when the app starts
   */
  startBackgroundProcessing(intervalMs: number = 300000) { // Default: 5 minutes
    if (this.processInterval) {
      console.log('📊 [POST-PROCESSOR] Background processing already running');
      return;
    }

    console.log('📊 [POST-PROCESSOR] Starting background processing');
    
    // Process immediately on start
    this.processUnvalidatedArticles();
    
    // Then process at intervals
    this.processInterval = setInterval(() => {
      this.processUnvalidatedArticles();
    }, intervalMs);
  }

  /**
   * Stop background processing
   */
  stopBackgroundProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('📊 [POST-PROCESSOR] Background processing stopped');
    }
  }

  /**
   * Process a single article with AI validation and enhancement
   */
  async processArticle(articleId: string): Promise<boolean> {
    try {
      console.log(`📊 [POST-PROCESSOR] Processing article: ${articleId}`);
      
      // Fetch the article from Firestore
      const articlesRef = collection(db, 'articles');
      const q = query(articlesRef, where('__name__', '==', articleId), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.error(`Article not found: ${articleId}`);
        return false;
      }

      const articleDoc = snapshot.docs[0];
      const article = { id: articleDoc.id, ...articleDoc.data() } as Article;

      // Skip if already validated
      if (article.aiValidated) {
        console.log(`📊 [POST-PROCESSOR] Article already validated: ${articleId}`);
        return true;
      }

      // Step 1: Validate article content
      const validationResult = await this.validateArticle(article);
      
      if (!validationResult) {
        console.error(`Failed to validate article: ${articleId}`);
        return false;
      }

      // Step 2: Decide on action based on quality score
      let updateData: any = {
        aiValidated: true,
        qualityScore: validationResult.qualityScore,
        validationResults: validationResult,
        lastValidated: Timestamp.now()
      };

      // Update JLPT level if detected
      if (validationResult.jlptLevel && validationResult.jlptLevel !== 'Unknown') {
        updateData.jlptLevel = validationResult.jlptLevel;
      }

      // If quality is too low (< 40), mark for deletion or manual review
      if (validationResult.qualityScore < 40) {
        updateData.needsReview = true;
        updateData.reviewReason = 'Low quality score';
        console.log(`⚠️ [POST-PROCESSOR] Article marked for review (low quality): ${articleId}`);
      }
      // If quality is moderate and can be fixed (40-70), use enhanced content
      else if (validationResult.enhancedContent && validationResult.qualityScore >= 40) {
        updateData.content = validationResult.enhancedContent;
        updateData.aiEnhanced = true;
        updateData.originalContent = article.content; // Keep original for reference
        console.log(`✅ [POST-PROCESSOR] Article enhanced: ${articleId}`);
      }

      // Step 3: Generate cover image if needed and quality is acceptable
      if (validationResult.qualityScore >= 60 && (!article.image || article.image.includes('unsplash'))) {
        const coverResult = await this.generateCoverImage(
          article.title,
          validationResult.imageKeywords
        );
        
        if (coverResult?.imageUrl) {
          updateData.image = coverResult.imageUrl;
          updateData.imageSource = coverResult.method;
          console.log(`🎨 [POST-PROCESSOR] Cover image generated: ${articleId}`);
        }
      }

      // Update the article in Firestore
      const articleRef = doc(db, 'articles', articleId);
      await updateDoc(articleRef, updateData);
      
      console.log(`✅ [POST-PROCESSOR] Article processed successfully: ${articleId}`);
      return true;

    } catch (error) {
      console.error(`Error processing article ${articleId}:`, error);
      return false;
    }
  }

  /**
   * Process all unvalidated articles in batches
   */
  async processUnvalidatedArticles(batchSize: number = 5) {
    if (this.isProcessing) {
      console.log('📊 [POST-PROCESSOR] Already processing articles');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('📊 [POST-PROCESSOR] Checking for unvalidated articles...');
      
      // Query for unvalidated articles (newest first)
      const articlesRef = collection(db, 'articles');
      const q = query(
        articlesRef,
        where('aiValidated', '!=', true),
        orderBy('publishedAt', 'desc'),
        limit(batchSize)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('📊 [POST-PROCESSOR] No unvalidated articles found');
        return;
      }

      console.log(`📊 [POST-PROCESSOR] Found ${snapshot.size} unvalidated articles`);
      
      // Process articles in parallel (but limit concurrency)
      const processingPromises = snapshot.docs.map(doc => 
        this.processArticle(doc.id)
      );
      
      const results = await Promise.allSettled(processingPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value).length;
      
      console.log(`📊 [POST-PROCESSOR] Batch complete: ${successful} successful, ${failed} failed`);
      
    } catch (error) {
      console.error('Error processing unvalidated articles:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Validate article using AI
   */
  private async validateArticle(article: Article) {
    try {
      // Use absolute URL for server-side calls
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/ai/validate-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          source: article.source,
          currentJlptLevel: article.jlptLevel
        })
      });

      if (!response.ok) {
        throw new Error(`Validation API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Article validation error:', error);
      return null;
    }
  }

  /**
   * Generate cover image using AI
   */
  private async generateCoverImage(title: string, keywords: string[]) {
    try {
      // Use absolute URL for server-side calls
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/ai/generate-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          keywords,
          preferDallE: false // Start with Unsplash to save costs
        })
      });

      if (!response.ok) {
        throw new Error(`Cover generation API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cover generation error:', error);
      return null;
    }
  }

  /**
   * Manually trigger processing of a specific article
   * Useful for testing or reprocessing
   */
  async reprocessArticle(articleId: string, forceReprocess: boolean = false) {
    if (forceReprocess) {
      // Remove validation flag to force reprocessing
      const articleRef = doc(db, 'articles', articleId);
      await updateDoc(articleRef, {
        aiValidated: false,
        aiEnhanced: false
      });
    }
    
    return this.processArticle(articleId);
  }
}

// Export singleton instance
export const articlePostProcessor = ArticlePostProcessor.getInstance();