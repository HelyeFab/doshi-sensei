// Advanced Reading Analytics and Comprehension System
import { NewsArticle, ExtractedVocabulary } from '@/types/news';
import { JLPTLevel } from '@/types';

// Reading session data
export interface ReadingSession {
  id: string;
  articleId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  readingTimeSeconds: number;
  wordsPerMinute: number;
  comprehensionScore?: number;
  vocabularyEncountered: string[];
  newVocabularyLearned: string[];
  difficultVocabulary: string[];
  scrollProgress: number;
  pauseCount: number;
  rereadSections: number[];
  completed: boolean;
  createdAt: Date;
}

// Comprehension quiz question
export interface ComprehensionQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: JLPTLevel;
  vocabularyFocus?: string[];
}

// Reading analytics data
export interface ReadingAnalytics {
  totalReadingTime: number; // in minutes
  averageReadingSpeed: number; // words per minute
  articlesRead: number;
  comprehensionAverage: number;
  vocabularyLearned: number;
  favoriteTopics: string[];
  readingStreak: number;
  lastReadingDate?: Date;
  improvementAreas: string[];
  recommendations: ReadingRecommendation[];
}

// Reading recommendation
export interface ReadingRecommendation {
  type: 'article' | 'topic' | 'difficulty' | 'vocabulary';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  articleSuggestion?: NewsArticle;
}

// Advanced Reading Analytics Manager
export class ReadingAnalyticsManager {
  private static readonly STORAGE_KEY = 'doshi_reading_analytics';
  private static readonly SESSIONS_KEY = 'doshi_reading_sessions';

  // Generate comprehension questions for an article
  static generateComprehensionQuestions(article: NewsArticle): ComprehensionQuestion[] {
    const questions: ComprehensionQuestion[] = [];

    // Generate questions based on article content
    const sentences = article.content.split('。').filter(s => s.length > 10);

    // Basic comprehension questions
    if (sentences.length >= 2) {
      questions.push({
        id: `${article.id}-q1`,
        type: 'multiple-choice',
        question: `この記事の主なテーマは何ですか？`,
        options: [
          this.extractMainTopic(article),
          this.generateDistractor(article.category, 1),
          this.generateDistractor(article.category, 2),
          '上記のいずれでもない'
        ],
        correctAnswer: 0,
        explanation: `記事の内容から、主なテーマは「${this.extractMainTopic(article)}」です。`,
        difficulty: article.difficulty,
        vocabularyFocus: this.extractKeyVocabulary(article)
      });
    }

    // True/False question about details
    if (sentences.length >= 1) {
      const detailSentence = sentences[0];
      questions.push({
        id: `${article.id}-q2`,
        type: 'true-false',
        question: `次の文は正しいですか？「${detailSentence}。」`,
        options: ['正しい', '間違っている'],
        correctAnswer: 0,
        explanation: '記事の内容に直接書かれています。',
        difficulty: article.difficulty
      });
    }

    // Vocabulary question
    const keyVocab = this.extractKeyVocabulary(article);
    if (keyVocab.length > 0) {
      const vocab = keyVocab[0];
      questions.push({
        id: `${article.id}-q3`,
        type: 'multiple-choice',
        question: `「${vocab}」の意味として最も適切なものはどれですか？`,
        options: [
          this.getVocabularyMeaning(vocab),
          this.generateVocabDistractor(vocab, 1),
          this.generateVocabDistractor(vocab, 2),
          this.generateVocabDistractor(vocab, 3)
        ],
        correctAnswer: 0,
        explanation: `「${vocab}」は「${this.getVocabularyMeaning(vocab)}」という意味です。`,
        difficulty: article.difficulty,
        vocabularyFocus: [vocab]
      });
    }

    return questions;
  }

  // Start a new reading session
  static startReadingSession(articleId: string, userId: string = 'anonymous'): ReadingSession {
    const session: ReadingSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      articleId,
      userId,
      startTime: new Date(),
      readingTimeSeconds: 0,
      wordsPerMinute: 0,
      vocabularyEncountered: [],
      newVocabularyLearned: [],
      difficultVocabulary: [],
      scrollProgress: 0,
      pauseCount: 0,
      rereadSections: [],
      completed: false,
      createdAt: new Date()
    };

    this.saveSession(session);
    return session;
  }

  // Update reading session progress
  static updateReadingSession(
    sessionId: string,
    updates: Partial<ReadingSession>
  ): ReadingSession | null {
    const sessions = this.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);

    if (sessionIndex === -1) return null;

    const session = { ...sessions[sessionIndex], ...updates };
    sessions[sessionIndex] = session;

    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    return session;
  }

  // Complete reading session
  static completeReadingSession(
    sessionId: string,
    comprehensionScore?: number
  ): ReadingSession | null {
    const session = this.updateReadingSession(sessionId, {
      endTime: new Date(),
      completed: true,
      comprehensionScore
    });

    if (session) {
      // Calculate reading speed
      const totalTimeMinutes = session.readingTimeSeconds / 60;
      const wordsRead = this.estimateWordsRead(session.articleId);
      session.wordsPerMinute = totalTimeMinutes > 0 ? wordsRead / totalTimeMinutes : 0;

      // Update overall analytics
      this.updateAnalytics(session);
    }

    return session;
  }

  // Calculate reading speed and analytics
  static calculateReadingSpeed(
    textLength: number,
    readingTimeSeconds: number
  ): number {
    // Estimate words from character count (Japanese)
    const estimatedWords = textLength / 2; // Rough estimate for Japanese
    const readingTimeMinutes = readingTimeSeconds / 60;

    return readingTimeMinutes > 0 ? estimatedWords / readingTimeMinutes : 0;
  }

  // Get personalized reading recommendations
  static getPersonalizedRecommendations(
    userAnalytics: ReadingAnalytics,
    availableArticles: NewsArticle[]
  ): ReadingRecommendation[] {
    const recommendations: ReadingRecommendation[] = [];

    // Recommend based on reading speed
    if (userAnalytics.averageReadingSpeed < 100) {
      recommendations.push({
        type: 'difficulty',
        title: '易しい記事で読解力を向上',
        description: 'N5レベルの記事から始めて、読解スピードを上げましょう',
        priority: 'high',
        reason: '読解スピードが平均より低いため',
        articleSuggestion: availableArticles.find(a => a.difficulty === 'N5')
      });
    }

    // Recommend based on comprehension
    if (userAnalytics.comprehensionAverage < 70) {
      recommendations.push({
        type: 'topic',
        title: '興味のあるトピックで理解力向上',
        description: '好きなテーマの記事で読解理解を深めましょう',
        priority: 'high',
        reason: '理解度が低いため',
        articleSuggestion: availableArticles.find(a =>
          userAnalytics.favoriteTopics.includes(a.category)
        )
      });
    }

    // Recommend vocabulary building
    if (userAnalytics.vocabularyLearned < 50) {
      recommendations.push({
        type: 'vocabulary',
        title: '語彙力強化',
        description: '新しい単語を覚えて読解力をアップしましょう',
        priority: 'medium',
        reason: '学習した語彙数が少ないため',
        articleSuggestion: availableArticles.find(a => a.difficulty === 'N4')
      });
    }

    // Recommend reading streak
    if (userAnalytics.readingStreak === 0) {
      recommendations.push({
        type: 'article',
        title: '毎日読書習慣',
        description: '短い記事から始めて毎日の読書習慣を作りましょう',
        priority: 'medium',
        reason: '読書習慣を作るため',
        articleSuggestion: availableArticles
          .filter(a => a.estimatedReadingTime <= 3)
          .sort((a, b) => a.estimatedReadingTime - b.estimatedReadingTime)[0]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Get reading analytics
  static getReadingAnalytics(userId: string = 'anonymous'): ReadingAnalytics {
    const sessions = this.getAllSessions().filter(s => s.userId === userId);
    const completed = sessions.filter(s => s.completed);

    if (completed.length === 0) {
      return this.getDefaultAnalytics();
    }

    const totalTime = completed.reduce((sum, s) => sum + s.readingTimeSeconds, 0);
    const averageSpeed = completed.reduce((sum, s) => sum + s.wordsPerMinute, 0) / completed.length;
    const comprehensionScores = completed.filter(s => s.comprehensionScore !== undefined);
    const averageComprehension = comprehensionScores.length > 0
      ? comprehensionScores.reduce((sum, s) => sum + (s.comprehensionScore || 0), 0) / comprehensionScores.length
      : 0;

    const allVocabulary = new Set<string>();
    completed.forEach(s => {
      s.vocabularyEncountered.forEach(v => allVocabulary.add(v));
    });

    // Calculate reading streak
    const streak = this.calculateReadingStreak(sessions);

    // Extract favorite topics
    const topicCounts: { [key: string]: number } = {};
    sessions.forEach(s => {
      // This would need to be enhanced with actual article data
      // For now, just mock some categories
      const mockCategory = ['weather', 'technology', 'society'][Math.floor(Math.random() * 3)];
      topicCounts[mockCategory] = (topicCounts[mockCategory] || 0) + 1;
    });

    const favoriteTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic]) => topic);

    return {
      totalReadingTime: totalTime / 60, // Convert to minutes
      averageReadingSpeed: averageSpeed,
      articlesRead: completed.length,
      comprehensionAverage: averageComprehension,
      vocabularyLearned: allVocabulary.size,
      favoriteTopics,
      readingStreak: streak,
      lastReadingDate: completed.length > 0 ? new Date(Math.max(...completed.map(s => s.startTime.getTime()))) : undefined,
      improvementAreas: this.identifyImprovementAreas(completed),
      recommendations: []
    };
  }

  // Helper methods
  private static extractMainTopic(article: NewsArticle): string {
    const topics = {
      weather: '天気・気候',
      politics: '政治・政府',
      economics: '経済・ビジネス',
      society: '社会・文化',
      technology: '科学・技術',
      sports: 'スポーツ',
      general: '一般ニュース'
    };
    return topics[article.category as keyof typeof topics] || '一般ニュース';
  }

  private static generateDistractor(category: string, index: number): string {
    const distractors = {
      weather: ['交通情報', 'スポーツ結果'],
      politics: ['経済動向', '文化イベント'],
      economics: ['天気予報', '科学技術'],
      society: ['政治ニュース', '気象情報'],
      technology: ['社会問題', '経済状況'],
      sports: ['政治情勢', '天気情報']
    };

    const categoryDistractors = distractors[category as keyof typeof distractors] || ['その他の話題', '関連情報'];
    return categoryDistractors[index % categoryDistractors.length];
  }

  private static extractKeyVocabulary(article: NewsArticle): string[] {
    // Extract key vocabulary from article (simplified)
    const japaneseWords = article.content.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}/g) || [];
    return [...new Set(japaneseWords)].slice(0, 5);
  }

  private static getVocabularyMeaning(vocab: string): string {
    // Mock vocabulary meanings (in production, this would use a dictionary API)
    const meanings: { [key: string]: string } = {
      '天気': '気象の状態',
      '政府': '国を治める機関',
      '経済': 'お金や商売の仕組み',
      '社会': '人々が集まって作る組織',
      '技術': '物事を行う方法や技能',
      '今日': '本日、この日',
      '明日': '次の日',
      '新しい': 'まだ古くない',
      '大きい': 'サイズが大きい'
    };
    return meanings[vocab] || '辞書で調べてください';
  }

  private static generateVocabDistractor(vocab: string, index: number): string {
    const distractors = [
      '間違った意味１',
      '間違った意味２',
      '間違った意味３'
    ];
    return distractors[index % distractors.length];
  }

  private static saveSession(session: ReadingSession): void {
    const sessions = this.getAllSessions();
    sessions.push(session);
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
  }

  private static getAllSessions(): ReadingSession[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(this.SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static estimateWordsRead(articleId: string): number {
    // This would fetch the actual article and count words
    // For now, return a reasonable estimate
    return 200; // Approximate words in a typical news article
  }

  private static updateAnalytics(session: ReadingSession): void {
    // Update overall analytics based on completed session
    // This would integrate with a more comprehensive analytics system
    console.log('Analytics updated for session:', session.id);
  }

  private static calculateReadingStreak(sessions: ReadingSession[]): number {
    if (sessions.length === 0) return 0;

    const completedSessions = sessions
      .filter(s => s.completed)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (completedSessions.length === 0) return 0;

    let streak = 1;
    let currentDate = new Date(completedSessions[0].startTime);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < completedSessions.length; i++) {
      const sessionDate = new Date(completedSessions[i].startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        streak++;
        currentDate = sessionDate;
      } else if (daysDiff > 1) {
        break;
      }
    }

    return streak;
  }

  private static identifyImprovementAreas(sessions: ReadingSession[]): string[] {
    const areas: string[] = [];

    const avgSpeed = sessions.reduce((sum, s) => sum + s.wordsPerMinute, 0) / sessions.length;
    const avgComprehension = sessions
      .filter(s => s.comprehensionScore !== undefined)
      .reduce((sum, s) => sum + (s.comprehensionScore || 0), 0) / sessions.length;

    if (avgSpeed < 100) areas.push('読書スピード');
    if (avgComprehension < 70) areas.push('理解度');
    if (sessions.some(s => s.pauseCount > 5)) areas.push('集中力');

    return areas;
  }

  private static getDefaultAnalytics(): ReadingAnalytics {
    return {
      totalReadingTime: 0,
      averageReadingSpeed: 0,
      articlesRead: 0,
      comprehensionAverage: 0,
      vocabularyLearned: 0,
      favoriteTopics: [],
      readingStreak: 0,
      improvementAreas: [],
      recommendations: []
    };
  }
}

// Export utility functions
export function formatReadingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}秒`;
  } else if (remainingSeconds === 0) {
    return `${minutes}分`;
  } else {
    return `${minutes}分${remainingSeconds}秒`;
  }
}

export function getReadingSpeedCategory(wpm: number): string {
  if (wpm < 80) return '遅い';
  if (wpm < 120) return '普通';
  if (wpm < 160) return '速い';
  return 'とても速い';
}

export function getComprehensionLevel(score: number): string {
  if (score < 50) return '要改善';
  if (score < 70) return '普通';
  if (score < 85) return '良い';
  return '優秀';
}
