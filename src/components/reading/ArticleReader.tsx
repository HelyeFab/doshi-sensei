'use client';

import { useState, useEffect, useRef } from 'react';
import { NewsArticle, ExtractedVocabulary } from '@/types/news';
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import { StudyListManager } from '@/utils/studyListManager';
import {
  ReadingAnalyticsManager,
  ReadingSession,
  formatReadingTime,
  getReadingSpeedCategory
} from '@/utils/readingAnalytics';
import ComprehensionQuiz from './ComprehensionQuiz';

interface ReadingSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  showFurigana: boolean;
  highlightVocabulary: boolean;
  darkMode: boolean;
}

interface VocabularyPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSaveToList: (word: JapaneseWord) => void;
}

function VocabularyPopup({ word, position, onClose, onSaveToList }: VocabularyPopupProps) {
  const [wordData, setWordData] = useState<JapaneseWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWordData = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await searchWords(word, 1);
        if (results.length > 0) {
          setWordData(results[0]);
        } else {
          setError('単語が見つかりません');
        }
      } catch (err) {
        setError('単語の検索に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchWordData();
  }, [word]);

  const handleSaveToList = () => {
    if (wordData) {
      onSaveToList(wordData);
    }
  };

  return (
    <div
      className="absolute z-50 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: position.y + 10,
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-foreground">{word}</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="animate-spin">⏳</span>
          <span>検索中...</span>
        </div>
      )}

      {error && (
        <div className="text-destructive text-sm">{error}</div>
      )}

      {wordData && (
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">読み方</div>
            <div className="font-medium">{wordData.kana}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">意味</div>
            <div>{wordData.meaning}</div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded">
              {wordData.jlpt}
            </span>
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
              {wordData.type}
            </span>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              onClick={handleSaveToList}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
            >
              リストに保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsPanelProps {
  settings: ReadingSettings;
  onSettingsChange: (settings: ReadingSettings) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const handleFontSizeChange = (fontSize: ReadingSettings['fontSize']) => {
    onSettingsChange({ ...settings, fontSize });
  };

  const handleToggleFurigana = () => {
    onSettingsChange({ ...settings, showFurigana: !settings.showFurigana });
  };

  const handleToggleVocabularyHighlight = () => {
    onSettingsChange({ ...settings, highlightVocabulary: !settings.highlightVocabulary });
  };

  return (
    <div className="absolute top-12 right-0 z-40 bg-card border border-border rounded-lg shadow-lg p-4 w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-foreground">読み設定</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            文字サイズ
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
              <button
                key={size}
                onClick={() => handleFontSizeChange(size)}
                className={`px-3 py-1 rounded text-sm ${
                  settings.fontSize === size
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {{
                  small: '小',
                  medium: '中',
                  large: '大',
                  xlarge: '特大'
                }[size]}
              </button>
            ))}
          </div>
        </div>

        {/* Furigana Toggle */}
        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              ふりがな表示
            </span>
            <button
              onClick={handleToggleFurigana}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showFurigana ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showFurigana ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Vocabulary Highlighting */}
        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              単語ハイライト
            </span>
            <button
              onClick={handleToggleVocabularyHighlight}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.highlightVocabulary ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.highlightVocabulary ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

interface ArticleReaderProps {
  article: NewsArticle;
  onBack: () => void;
}

export function ArticleReader({ article, onBack }: ArticleReaderProps) {
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 'medium',
    showFurigana: true,
    highlightVocabulary: true,
    darkMode: false
  });

  const [showSettings, setShowSettings] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    position: { x: number; y: number };
  } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingStartTime] = useState(new Date());
  const [readingProgress, setReadingProgress] = useState(0);
  const [readingSession, setReadingSession] = useState<ReadingSession | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizDismissed, setQuizDismissed] = useState(false);
  const [comprehensionScore, setComprehensionScore] = useState<number | null>(null);
  const [readingTimeDisplay, setReadingTimeDisplay] = useState(0);
  const [vocabularyEncountered, setVocabularyEncountered] = useState<Set<string>>(new Set());
  const [statsVisible, setStatsVisible] = useState(false);
  const [userRequestedStats, setUserRequestedStats] = useState(false);
  const [stableWPM, setStableWPM] = useState(0);
  const [processedContent, setProcessedContent] = useState<string[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  const articleRef = useRef<HTMLDivElement>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Extract vocabulary from article content
  const extractVocabularyFromText = (text: string): string[] => {
    // Simple Japanese word extraction (this would be more sophisticated in production)
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    const matches = text.match(japaneseRegex) || [];
    return [...new Set(matches)].filter(word => word.length > 1);
  };

  // Handle word click for vocabulary lookup
  const handleWordClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (!settings.highlightVocabulary) return;

    const target = event.target as HTMLSpanElement;
    const word = target.textContent?.trim();

    if (word && word.length > 1) {
      const rect = target.getBoundingClientRect();
      setSelectedWord({
        word,
        position: {
          x: rect.left,
          y: rect.top + window.scrollY
        }
      });
    }
  };

  // Save word to study list
  const handleSaveWordToList = async (word: JapaneseWord) => {
    try {
      // Get or create a default reading list
      const lists = await StudyListManager.getAllStudyLists();
      let readingList = lists.find(list => list.name === 'Reading Practice');

      if (!readingList) {
        readingList = await StudyListManager.createStudyList(
          'Reading Practice',
          'drillable',
          'Words from news articles'
        );
      }

      await StudyListManager.addItemToLists(word, 'word', [readingList.id]);

      // Close popup
      setSelectedWord(null);

      // Show success message (you could add a toast notification here)
      console.log(`Saved "${word.kanji}" to Reading Practice list`);
    } catch (error) {
      console.error('Failed to save word to list:', error);
    }
  };

  // Add furigana to Japanese text using pattern-based approach
  const addFuriganaToText = async (text: string): Promise<string> => {
    if (!settings.showFurigana) {
      return text;
    }

    // Comprehensive furigana patterns for common Japanese words
    const furiganaPatterns: { [key: string]: string } = {
      // Time and dates
      '今日': '<ruby>今日<rp>(</rp><rt>きょう</rt><rp>)</rp></ruby>',
      '明日': '<ruby>明日<rp>(</rp><rt>あした</rt><rp>)</rp></ruby>',
      '昨日': '<ruby>昨日<rp>(</rp><rt>きのう</rt><rp>)</rp></ruby>',
      '時間': '<ruby>時間<rp>(</rp><rt>じかん</rt><rp>)</rp></ruby>',
      '午前': '<ruby>午前<rp>(</rp><rt>ごぜん</rt><rp>)</rp></ruby>',
      '午後': '<ruby>午後<rp>(</rp><rt>ごご</rt><rp>)</rp></ruby>',
      '毎年': '<ruby>毎年<rp>(</rp><rt>まいとし</rt><rp>)</rp></ruby>',
      '去年': '<ruby>去年<rp>(</rp><rt>きょねん</rt><rp>)</rp></ruby>',

      // Places and geography
      '東京': '<ruby>東京<rp>(</rp><rt>とうきょう</rt><rp>)</rp></ruby>',
      '日本': '<ruby>日本<rp>(</rp><rt>にほん</rt><rp>)</rp></ruby>',
      '学校': '<ruby>学校<rp>(</rp><rt>がっこう</rt><rp>)</rp></ruby>',
      '会社': '<ruby>会社<rp>(</rp><rt>かいしゃ</rt><rp>)</rp></ruby>',
      '病院': '<ruby>病院<rp>(</rp><rt>びょういん</rt><rp>)</rp></ruby>',
      '空港': '<ruby>空港<rp>(</rp><rt>くうこう</rt><rp>)</rp></ruby>',
      '駅': '<ruby>駅<rp>(</rp><rt>えき</rt><rp>)</rp></ruby>',
      '図書館': '<ruby>図書館<rp>(</rp><rt>としょかん</rt><rp>)</rp></ruby>',
      '市内': '<ruby>市内<rp>(</rp><rt>しない</rt><rp>)</rp></ruby>',
      '県内': '<ruby>県内<rp>(</rp><rt>けんない</rt><rp>)</rp></ruby>',
      '国内': '<ruby>国内<rp>(</rp><rt>こくない</rt><rp>)</rp></ruby>',
      '海外': '<ruby>海外<rp>(</rp><rt>かいがい</rt><rp>)</rp></ruby>',

      // Demographics and society
      '人口': '<ruby>人口<rp>(</rp><rt>じんこう</rt><rp>)</rp></ruby>',
      '減少': '<ruby>減少<rp>(</rp><rt>げんしょう</rt><rp>)</rp></ruby>',
      '出生率': '<ruby>出生率<rp>(</rp><rt>しゅっしょうりつ</rt><rp>)</rp></ruby>',
      '高齢化': '<ruby>高齢化<rp>(</rp><rt>こうれいか</rt><rp>)</rp></ruby>',
      '社会': '<ruby>社会<rp>(</rp><rt>しゃかい</rt><rp>)</rp></ruby>',
      '文化': '<ruby>文化<rp>(</rp><rt>ぶんか</rt><rp>)</rp></ruby>',
      '教育': '<ruby>教育<rp>(</rp><rt>きょういく</rt><rp>)</rp></ruby>',
      '経済': '<ruby>経済<rp>(</rp><rt>けいざい</rt><rp>)</rp></ruby>',

      // Government and politics
      '政府': '<ruby>政府<rp>(</rp><rt>せいふ</rt><rp>)</rp></ruby>',
      '対策': '<ruby>対策<rp>(</rp><rt>たいさく</rt><rp>)</rp></ruby>',
      '法律': '<ruby>法律<rp>(</rp><rt>ほうりつ</rt><rp>)</rp></ruby>',
      '規則': '<ruby>規則<rp>(</rp><rt>きそく</rt><rp>)</rp></ruby>',
      '制限': '<ruby>制限<rp>(</rp><rt>せいげん</rt><rp>)</rp></ruby>',
      '禁止': '<ruby>禁止<rp>(</rp><rt>きんし</rt><rp>)</rp></ruby>',
      '許可': '<ruby>許可<rp>(</rp><rt>きょか</rt><rp>)</rp></ruby>',
      '申請': '<ruby>申請<rp>(</rp><rt>しんせい</rt><rp>)</rp></ruby>',

      // Common words and expressions
      '問題': '<ruby>問題<rp>(</rp><rt>もんだい</rt><rp>)</rp></ruby>',
      '可能': '<ruby>可能<rp>(</rp><rt>かのう</rt><rp>)</rp></ruby>',
      '必要': '<ruby>必要<rp>(</rp><rt>ひつよう</rt><rp>)</rp></ruby>',
      '重要': '<ruby>重要<rp>(</rp><rt>じゅうよう</rt><rp>)</rp></ruby>',
      '大切': '<ruby>大切<rp>(</rp><rt>たいせつ</rt><rp>)</rp></ruby>',
      '特別': '<ruby>特別<rp>(</rp><rt>とくべつ</rt><rp>)</rp></ruby>',
      '普通': '<ruby>普通<rp>(</rp><rt>ふつう</rt><rp>)</rp></ruby>',
      '一般': '<ruby>一般<rp>(</rp><rt>いっぱん</rt><rp>)</rp></ruby>',
      '全体': '<ruby>全体<rp>(</rp><rt>ぜんたい</rt><rp>)</rp></ruby>',
      '部分': '<ruby>部分<rp>(</rp><rt>ぶぶん</rt><rp>)</rp></ruby>',
      '方法': '<ruby>方法<rp>(</rp><rt>ほうほう</rt><rp>)</rp></ruby>',
      '手段': '<ruby>手段<rp>(</rp><rt>しゅだん</rt><rp>)</rp></ruby>',
      '計画': '<ruby>計画<rp>(</rp><rt>けいかく</rt><rp>)</rp></ruby>',
      '予定': '<ruby>予定<rp>(</rp><rt>よてい</rt><rp>)</rp></ruby>',
      '決定': '<ruby>決定<rp>(</rp><rt>けってい</rt><rp>)</rp></ruby>',
      '変更': '<ruby>変更<rp>(</rp><rt>へんこう</rt><rp>)</rp></ruby>',
      '中止': '<ruby>中止<rp>(</rp><rt>ちゅうし</rt><rp>)</rp></ruby>',
      '延期': '<ruby>延期<rp>(</rp><rt>えんき</rt><rp>)</rp></ruby>',
      '実施': '<ruby>実施<rp>(</rp><rt>じっし</rt><rp>)</rp></ruby>',
      '開始': '<ruby>開始<rp>(</rp><rt>かいし</rt><rp>)</rp></ruby>',
      '終了': '<ruby>終了<rp>(</rp><rt>しゅうりょう</rt><rp>)</rp></ruby>',
      '継続': '<ruby>継続<rp>(</rp><rt>けいぞく</rt><rp>)</rp></ruby>',

      // Numbers and quantities
      '万人': '<ruby>万人<rp>(</rp><rt>まんにん</rt><rp>)</rp></ruby>',
      '最近': '<ruby>最近<rp>(</rp><rt>さいきん</rt><rp>)</rp></ruby>',
      '以前': '<ruby>以前<rp>(</rp><rt>いぜん</rt><rp>)</rp></ruby>',
      '将来': '<ruby>将来<rp>(</rp><rt>しょうらい</rt><rp>)</rp></ruby>',
      '過去': '<ruby>過去<rp>(</rp><rt>かこ</rt><rp>)</rp></ruby>',
      '現在': '<ruby>現在<rp>(</rp><rt>げんざい</rt><rp>)</rp></ruby>',
      '未来': '<ruby>未来<rp>(</rp><rt>みらい</rt><rp>)</rp></ruby>',

      // Weather and environment
      '天気': '<ruby>天気<rp>(</rp><rt>てんき</rt><rp>)</rp></ruby>',
      '雨': '<ruby>雨<rp>(</rp><rt>あめ</rt><rp>)</rp></ruby>',
      '雪': '<ruby>雪<rp>(</rp><rt>ゆき</rt><rp>)</rp></ruby>',
      '風': '<ruby>風<rp>(</rp><rt>かぜ</rt><rp>)</rp></ruby>',
      '台風': '<ruby>台風<rp>(</rp><rt>たいふう</rt><rp>)</rp></ruby>',
      '地震': '<ruby>地震<rp>(</rp><rt>じしん</rt><rp>)</rp></ruby>',
      '災害': '<ruby>災害<rp>(</rp><rt>さいがい</rt><rp>)</rp></ruby>',
      '環境': '<ruby>環境<rp>(</rp><rt>かんきょう</rt><rp>)</rp></ruby>',
      '自然': '<ruby>自然<rp>(</rp><rt>しぜん</rt><rp>)</rp></ruby>',
      '地球': '<ruby>地球<rp>(</rp><rt>ちきゅう</rt><rp>)</rp></ruby>',

      // Technology and business
      '技術': '<ruby>技術<rp>(</rp><rt>ぎじゅつ</rt><rp>)</rp></ruby>',
      '科学': '<ruby>科学<rp>(</rp><rt>かがく</rt><rp>)</rp></ruby>',
      '研究': '<ruby>研究<rp>(</rp><rt>けんきゅう</rt><rp>)</rp></ruby>',
      '開発': '<ruby>開発<rp>(</rp><rt>かいはつ</rt><rp>)</rp></ruby>',
      '建設': '<ruby>建設<rp>(</rp><rt>けんせつ</rt><rp>)</rp></ruby>',
      '工事': '<ruby>工事<rp>(</rp><rt>こうじ</rt><rp>)</rp></ruby>',
      '製造': '<ruby>製造<rp>(</rp><rt>せいぞう</rt><rp>)</rp></ruby>',
      '生産': '<ruby>生産<rp>(</rp><rt>せいさん</rt><rp>)</rp></ruby>',
      '販売': '<ruby>販売<rp>(</rp><rt>はんばい</rt><rp>)</rp></ruby>',
      '商品': '<ruby>商品<rp>(</rp><rt>しょうひん</rt><rp>)</rp></ruby>',
      '価格': '<ruby>価格<rp>(</rp><rt>かかく</rt><rp>)</rp></ruby>',
      '料金': '<ruby>料金<rp>(</rp><rt>りょうきん</rt><rp>)</rp></ruby>',

      // Single kanji common words
      '人': '<ruby>人<rp>(</rp><rt>ひと</rt><rp>)</rp></ruby>',
      '年': '<ruby>年<rp>(</rp><rt>とし</rt><rp>)</rp></ruby>',
      '月': '<ruby>月<rp>(</rp><rt>つき</rt><rp>)</rp></ruby>',
      '日': '<ruby>日<rp>(</rp><rt>ひ</rt><rp>)</rp></ruby>',
      '車': '<ruby>車<rp>(</rp><rt>くるま</rt><rp>)</rp></ruby>',
      '水': '<ruby>水<rp>(</rp><rt>みず</rt><rp>)</rp></ruby>',
      '火': '<ruby>火<rp>(</rp><rt>ひ</rt><rp>)</rp></ruby>',
      '土': '<ruby>土<rp>(</rp><rt>つち</rt><rp>)</rp></ruby>',
      '木': '<ruby>木<rp>(</rp><rt>き</rt><rp>)</rp></ruby>',
      '金': '<ruby>金<rp>(</rp><rt>きん</rt><rp>)</rp></ruby>',
      '山': '<ruby>山<rp>(</rp><rt>やま</rt><rp>)</rp></ruby>',
      '川': '<ruby>川<rp>(</rp><rt>かわ</rt><rp>)</rp></ruby>',
      '海': '<ruby>海<rp>(</rp><rt>うみ</rt><rp>)</rp></ruby>',
      '空': '<ruby>空<rp>(</rp><rt>そら</rt><rp>)</rp></ruby>'
    };

    let processedText = text;

    // Sort by length to handle compound words first
    const sortedPatterns = Object.entries(furiganaPatterns).sort(([a], [b]) => b.length - a.length);

    sortedPatterns.forEach(([kanji, furigana]) => {
      // Use word boundary-aware regex to prevent partial matches
      const regex = new RegExp(`(?<![一-龯])${kanji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![一-龯])`, 'g');
      processedText = processedText.replace(regex, furigana);
    });

    console.log(`Applied furigana to text: ${sortedPatterns.length} patterns processed`);
    return processedText;
  };

  // Render text with vocabulary highlighting and furigana
  const renderTextWithHighlighting = async (text: string): Promise<string> => {
    let processedText = text;

    // First add furigana if enabled
    if (settings.showFurigana) {
      processedText = await addFuriganaToText(processedText);
    }

    // Then add vocabulary highlighting if enabled
    if (settings.highlightVocabulary) {
      const vocabulary = extractVocabularyFromText(text); // Use original text for extraction

      vocabulary.forEach((word) => {
        // Skip if word is already part of a ruby tag
        if (processedText.includes(`<ruby>${word}`) || processedText.includes(`<rt>${word}`)) {
          return;
        }

        const regex = new RegExp(`(?<!<[^>]*)(${word})(?![^<]*>)`, 'g');
        processedText = processedText.replace(
          regex,
          `<span class="vocabulary-highlight cursor-pointer hover:bg-primary/20 transition-colors rounded px-0.5" data-word="$1">$1</span>`
        );
      });
    }

    return processedText;
  };

  // Track reading progress
  const handleScroll = () => {
    if (articleRef.current) {
      const element = articleRef.current;
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = element.offsetHeight;

      const progress = Math.min(
        100,
        Math.max(0, ((scrollTop + windowHeight - element.offsetTop) / documentHeight) * 100)
      );

      setReadingProgress(progress);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Process article content when settings change
  useEffect(() => {
    const processContent = async () => {
      setContentLoading(true);
      try {
        const paragraphs = article.content.split('\n');
        const processedParagraphs = await Promise.all(
          paragraphs.map(paragraph => renderTextWithHighlighting(paragraph))
        );
        setProcessedContent(processedParagraphs);
      } catch (error) {
        console.error('Error processing article content:', error);
        // Fallback to unprocessed content
        setProcessedContent(article.content.split('\n'));
      } finally {
        setContentLoading(false);
      }
    };

    processContent();
  }, [article.content, settings.showFurigana, settings.highlightVocabulary]);

  // Initialize reading session
  useEffect(() => {
    const session = ReadingAnalyticsManager.startReadingSession(article.id);
    setReadingSession(session);

    // Track vocabulary encountered (only once)
    const vocabulary = extractVocabularyFromText(article.content);
    setVocabularyEncountered(new Set(vocabulary));

    // Update reading time only when stats are visible and user requested them
    if (userRequestedStats) {
      timeUpdateInterval.current = setInterval(() => {
        setReadingTimeDisplay(prev => prev + 1);

        // Update session progress
        if (session) {
          ReadingAnalyticsManager.updateReadingSession(session.id, {
            readingTimeSeconds: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
            scrollProgress: readingProgress,
            vocabularyEncountered: Array.from(vocabularyEncountered)
          });
        }
      }, 5000); // Update every 5 seconds instead of every second
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [article.id, article.content, userRequestedStats]);

  // Load bookmark status
  useEffect(() => {
    // This would check if the article is bookmarked
    // For now, we'll just set it to false
    setIsBookmarked(false);
  }, [article.id]);

  const handleBookmarkToggle = () => {
    setIsBookmarked(!isBookmarked);
    // Here you would save/remove the bookmark from storage
  };

  // Handle reading completion
  const handleReadingComplete = () => {
    if (readingSession && readingProgress >= 80) {
      setShowQuiz(true);
    }
  };

  // Handle comprehension quiz completion
  const handleQuizComplete = (score: number) => {
    setComprehensionScore(score);
    setQuizCompleted(true);
    setShowQuiz(false);
  };

  // Quiz notification - completely user-controlled (no auto-display)
  const [showQuizNotification, setShowQuizNotification] = useState(false);

  // Removed automatic quiz notification - quiz is now only available via manual trigger

  const getFontSizeClass = () => {
    const sizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
      xlarge: 'text-xl'
    };
    return sizes[settings.fontSize];
  };

  const getReadingSpeedWPM = () => {
    if (readingTimeDisplay === 0) return 0;
    const estimatedWords = article.content.length / 2; // Rough estimate for Japanese
    const minutes = readingTimeDisplay / 60;
    return Math.round(estimatedWords / minutes);
  };

  return (
    <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with navigation and controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <span>←</span>
            記事一覧に戻る
          </button>

          <div className="flex items-center gap-2">
            {/* Audio Player button */}
            <button
              onClick={() => window.location.href = `/reading/audio?id=${article.id}`}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Open Audio Reader"
            >
              🎵
            </button>


            {/* Quiz button */}
            <button
              onClick={() => setShowQuiz(true)}
              className={`p-2 rounded-lg transition-colors ${
                showQuiz
                  ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Take Comprehension Quiz"
              disabled={quizCompleted}
            >
              🎯
            </button>

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-lg transition-colors ${
                isBookmarked
                  ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {isBookmarked ? '★' : '☆'}
            </button>

            {/* Settings button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                ⚙️
              </button>

              {showSettings && (
                <SettingsPanel
                  settings={settings}
                  onSettingsChange={setSettings}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="w-full bg-muted rounded-full h-1 mb-6">
          <div
            className="bg-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* Article content */}
        <article
          ref={articleRef}
          className="bg-card rounded-lg p-6 md:p-8 border border-border"
        >
          {/* Article header */}
          <header className="mb-8">
            <h1 className={`font-bold text-foreground mb-4 ${
              settings.fontSize === 'xlarge' ? 'text-3xl' :
              settings.fontSize === 'large' ? 'text-2xl' :
              settings.fontSize === 'medium' ? 'text-xl' : 'text-lg'
            }`}>
              {article.title}
            </h1>

            {/* Article metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
              <span>📅 {new Date(article.publishDate).toLocaleDateString('ja-JP')}</span>
              <span>📖 約{article.estimatedReadingTime}分</span>
              <span>📊 {article.difficulty}</span>
              <span>🏷️ {article.category}</span>
            </div>

            {/* Article image */}
            {article.imageUrl && (
              <div className="w-full max-w-2xl mx-auto mb-6">
                <img
                  src={article.imageUrl}
                  alt=""
                  className="w-full rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </header>

          {/* Article body */}
          <div
            className={`prose prose-lg max-w-none leading-relaxed ${getFontSizeClass()}`}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.classList.contains('vocabulary-highlight')) {
                handleWordClick(e as any);
              }
            }}
          >
            {contentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Processing content...</p>
              </div>
            ) : (
              processedContent.map((paragraph, index) => (
                <p
                  key={index}
                  className="mb-6 text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: paragraph
                  }}
                />
              ))
            )}
          </div>

          {/* Article footer */}
          <footer className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-muted-foreground">
                読了時間: {Math.ceil((new Date().getTime() - readingStartTime.getTime()) / 60000)}分
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                元の記事を見る →
              </a>
            </div>
          </footer>
        </article>

        {/* Vocabulary popup */}
        {selectedWord && (
          <VocabularyPopup
            word={selectedWord.word}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onSaveToList={handleSaveWordToList}
          />
        )}


        {/* Quiz Notification Banner */}
        {showQuizNotification && !showQuiz && !quizCompleted && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-lg max-w-md z-50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Ready for Comprehension Quiz?
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  You've read 80% of the article. Test your understanding!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQuiz(true);
                      setShowQuizNotification(false);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Take Quiz
                  </button>
                  <button
                    onClick={() => {
                      setShowQuizNotification(false);
                      setQuizDismissed(true);
                    }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    No Thanks
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowQuizNotification(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Comprehension Quiz */}
        {showQuiz && readingSession && (
          <ComprehensionQuiz
            article={article}
            sessionId={readingSession.id}
            onComplete={handleQuizComplete}
            onClose={() => setShowQuiz(false)}
          />
        )}


        {/* Reading Completion Celebration */}
        {quizCompleted && comprehensionScore !== null && (
          <div className="fixed top-4 right-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">�</span>
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                  記事読了完了！
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  理解度スコア: {comprehensionScore}点
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  読書時間: {formatReadingTime(readingTimeDisplay)} |
                  速度: {getReadingSpeedCategory(getReadingSpeedWPM())}
                </p>
              </div>
              <button
                onClick={() => setQuizCompleted(false)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close popups */}
        {(selectedWord || showSettings) && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setSelectedWord(null);
              setShowSettings(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ArticleReader;
