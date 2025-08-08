'use client';

import { useState } from 'react';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
// Removed heroicons import due to Next.js 15 build issue

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'What is Dōshi Sensei?',
    answer: 'Dōshi Sensei is a comprehensive Japanese language learning platform designed to help you master Japanese through interactive lessons, games, and practice exercises. We offer conjugation practice, vocabulary study, kanji learning, reading comprehension, and much more.'
  },
  {
    category: 'Getting Started',
    question: 'Do I need to create an account to use Dōshi Sensei?',
    answer: 'No! You can start learning immediately as a guest with limited daily access. Creating a free account gives you the same limits but adds the ability to save your progress, create custom lists, and sync across devices.'
  },
  {
    category: 'Getting Started',
    question: 'Is Dōshi Sensei suitable for beginners?',
    answer: 'Absolutely! We have content for all levels from complete beginners (learning hiragana/katakana) to advanced learners (N1 level content). Our snake path progression system guides you through a structured learning journey.'
  },
  {
    category: 'Getting Started',
    question: 'What learning resources does Dōshi Sensei use?',
    answer: 'We integrate vocabulary from popular textbooks like Genki and Minna no Nihongo, JLPT-graded content (N5-N1), and comprehensive dictionary data from JMdict. We also provide AI-generated stories and real Japanese news articles for reading practice.'
  },

  // Subscription & Pricing
  {
    category: 'Subscription & Pricing',
    question: 'How much does Dōshi Sensei cost?',
    answer: 'We offer three tiers: Guest (free, no account required), Free Account (free with registration), and Premium (monthly or annual subscription). Premium users get unlimited access to all features, while free users have daily limits.'
  },
  {
    category: 'Subscription & Pricing',
    question: 'What\'s the difference between free and premium accounts?',
    answer: 'Free users have daily limits on games and drills, limited storage for lists and bookmarks. Premium users enjoy unlimited everything: unlimited games, drills, lists, bookmarks, AI features, YouTube shadowing, and priority support.'
  },
  {
    category: 'Subscription & Pricing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes! You can cancel your subscription at any time from your account settings. You\'ll continue to have premium access until the end of your current billing period. We also offer a money-back guarantee for new subscribers.'
  },
  {
    category: 'Subscription & Pricing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, debit cards, and digital wallets through our secure payment processor, Stripe. Your payment information is never stored on our servers.'
  },

  // Features & Learning
  {
    category: 'Features & Learning',
    question: 'What is the Three-Pillar Architecture?',
    answer: 'Our Three-Pillar Architecture is a system that manages access to features based on your subscription level. It tracks your daily usage, enforces limits for free users, and ensures premium users have unlimited access. Everything is managed automatically so you can focus on learning.'
  },
  {
    category: 'Features & Learning',
    question: 'What are kanji mood boards?',
    answer: 'Kanji mood boards are visual collections of related kanji organized by themes (like emotions, nature, or actions). They help you learn kanji in context and see connections between characters, making memorization easier and more meaningful.'
  },
  {
    category: 'Features & Learning',
    question: 'How does the spaced repetition system (SRS) work?',
    answer: 'Our SRS algorithm, based on Anki\'s proven system, shows you flashcards at optimal intervals for long-term retention. Cards you know well appear less frequently, while difficult cards appear more often. Premium users can import their own Anki decks.'
  },
  {
    category: 'Features & Learning',
    question: 'What is the Textbook Vocabulary feature?',
    answer: 'The Textbook Vocabulary feature provides interactive learning for thousands of vocabulary cards from Genki and Minna no Nihongo textbooks. It uses FSRS spaced repetition, stores progress locally for all users, and syncs to the cloud for premium users. Free users have daily study limits, while premium users have unlimited access. Each card includes audio, example sentences, and kanji breakdowns.'
  },
  {
    category: 'Features & Learning',
    question: 'What is YouTube shadowing?',
    answer: 'YouTube shadowing lets you practice Japanese by following along with YouTube videos. We extract transcripts (even when YouTube doesn\'t provide Japanese captions!), add furigana, and provide synchronized highlighting so you can practice pronunciation and listening comprehension. The system caches popular videos so the community benefits - once one person uses a video, it loads instantly for everyone else. Premium feature only.'
  },
  {
    category: 'Features & Learning',
    question: 'How does YouTube shadowing handle videos without Japanese captions?',
    answer: 'We use SupaData AI to extract transcripts from YouTube videos that don\'t have Japanese captions available. This solves the "biggest wall" - many Japanese YouTube videos don\'t provide captions. Our system intelligently extracts, transcribes, and caches the content so you can practice with virtually any Japanese YouTube video.'
  },
  {
    category: 'Features & Learning',
    question: 'Can I track my learning progress?',
    answer: 'Yes! We track your daily streak, study time, words learned, games played, and more. Premium users get detailed analytics and progress reports. Your progress is saved locally and (for registered users) synced to the cloud.'
  },

  // Games & Practice
  {
    category: 'Games & Practice',
    question: 'What games are available?',
    answer: 'We offer several educational games: Kanji Quest (Pokémon-style battles), Kana Drop (Tetris-like), Sentence Scramble, Memory Match, Reading Routes, Kanji Simon Says, and Stroke Order Practice. Each game reinforces different aspects of Japanese.'
  },
  {
    category: 'Games & Practice',
    question: 'How do daily limits work for games?',
    answer: 'Free users have a daily limit on game sessions (resets at midnight your local time). Each game type has its own limit, so you get separate limits for each game. Premium users have unlimited access.'
  },
  {
    category: 'Games & Practice',
    question: 'What is drill practice?',
    answer: 'Drill practice includes conjugation exercises, flashcard reviews, and kana study sessions. These focused exercises help you master specific grammar patterns and vocabulary through repetition and immediate feedback.'
  },

  // Technical & Account
  {
    category: 'Technical & Account',
    question: 'Does Dōshi Sensei work offline?',
    answer: 'Yes! As a Progressive Web App (PWA), Dōshi Sensei works offline once installed. Your progress is saved locally and syncs when you reconnect. Some features like news articles and YouTube shadowing require an internet connection.'
  },
  {
    category: 'Technical & Account',
    question: 'How do I install the app on my phone?',
    answer: 'Visit doshisensei.com in your mobile browser. On iOS Safari, tap the share button and "Add to Home Screen". On Android Chrome, you\'ll see an "Install" prompt or use the menu to "Install app". It works just like a native app!'
  },
  {
    category: 'Technical & Account',
    question: 'Is my data safe and private?',
    answer: 'Absolutely. We use industry-standard encryption, never sell your data, and you can delete your account and all data at any time. Premium users\' data is backed up to secure Firebase servers. See our Privacy Policy for full details.'
  },
  {
    category: 'Technical & Account',
    question: 'Can I use Dōshi Sensei on multiple devices?',
    answer: 'Yes! Free registered users and premium subscribers can access their account on unlimited devices. Your progress syncs automatically across all devices when you\'re signed in.'
  },
  {
    category: 'Technical & Account',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot password?" on the login page and enter your email. We\'ll send you a secure link to reset your password. The link expires after 1 hour for security.'
  },

  // Study Methods
  {
    category: 'Study Methods',
    question: 'What is the snake path progression?',
    answer: 'The snake path is our guided learning journey that takes you from basic kana through advanced kanji and grammar. It\'s designed to introduce concepts in the optimal order, building on what you\'ve already learned.'
  },
  {
    category: 'Study Methods',
    question: 'How do I know which JLPT level to study?',
    answer: 'Start with N5 (beginner) if you\'re new to Japanese. If you know hiragana/katakana and basic grammar, try N4. N3 is intermediate, N2 is advanced, and N1 is near-native level. You can switch levels anytime.'
  },
  {
    category: 'Study Methods',
    question: 'Can I create custom study lists?',
    answer: 'Yes! Free users can create a limited number of lists with a cap on items per list. Premium users can create unlimited lists with unlimited items. Lists can include vocabulary, kanji, or any content you want to study.'
  },
  {
    category: 'Study Methods',
    question: 'What textbooks are supported?',
    answer: 'We currently support vocabulary from Genki I & II and Minna no Nihongo. Each lesson\'s vocabulary is available for study with our spaced repetition system. More textbooks are planned for the future.'
  },

  // Troubleshooting
  {
    category: 'Troubleshooting',
    question: 'Why am I seeing "limit reached" when I haven\'t used my daily allowance?',
    answer: 'Daily limits reset at midnight in your local timezone. If you\'re still seeing this message, try refreshing the page or clearing your browser cache. Contact support if the issue persists.'
  },
  {
    category: 'Troubleshooting',
    question: 'Audio isn\'t working. What should I do?',
    answer: 'Check that your device volume is on and the mute switch is off. On iOS, make sure Silent Mode is disabled. For text-to-speech, ensure your browser allows audio playback (some browsers block autoplay).'
  },
  {
    category: 'Troubleshooting',
    question: 'The app isn\'t loading or is running slowly. How can I fix this?',
    answer: 'Try these steps: 1) Clear your browser cache, 2) Disable browser extensions, 3) Try a different browser, 4) Check your internet connection, 5) Update your browser to the latest version.'
  },
  {
    category: 'Troubleshooting',
    question: 'My progress isn\'t syncing between devices. What\'s wrong?',
    answer: 'Make sure you\'re logged into the same account on all devices. Check your internet connection. Go to Settings > Sync and tap "Force Sync". If you\'re a guest user, progress doesn\'t sync - create a free account to enable syncing.'
  },

  // Advanced Features
  {
    category: 'Advanced Features',
    question: 'Can I import my Anki decks?',
    answer: 'Yes! Premium users can import .apkg files from Anki. Go to Drill > Flashcards > Import Anki Deck. We\'ll convert your cards and preserve your SRS intervals. HTML formatting and images are supported.'
  },
  {
    category: 'Advanced Features',
    question: 'How do achievements work?',
    answer: 'Achievements are earned by reaching milestones like study streaks, words learned, or games won. They\'re automatically tracked and displayed in your profile. Some achievements unlock special features or customization options.'
  },
  {
    category: 'Advanced Features',
    question: 'What are AI-generated stories?',
    answer: 'Our AI creates custom Japanese stories based on your level and interests. Each story includes vocabulary at your level, furigana support, and comprehension questions. Premium users can generate unlimited stories.'
  },
  {
    category: 'Advanced Features',
    question: 'Can I customize the app interface?',
    answer: 'Yes! You can customize your mobile navigation (choose which 3 features appear in the bottom nav), switch between light/dark themes, adjust font sizes, and configure study preferences in Settings.'
  },

  // Community & Support
  {
    category: 'Community & Support',
    question: 'How do I report a bug or suggest a feature?',
    answer: 'Use the Contact form and select "Bug Report" or "Feature Request" as the category. Include as much detail as possible. Premium users get priority support with faster response times.'
  },
  {
    category: 'Community & Support',
    question: 'Is there a community or forum?',
    answer: 'We\'re building a community feature where learners can share tips, ask questions, and practice together. For now, you can join discussions on our social media channels or Discord server.'
  },
  {
    category: 'Community & Support',
    question: 'Do you offer refunds?',
    answer: 'Yes! New subscribers get a money-back guarantee period. If you\'re not satisfied, contact us within the guarantee period for a full refund. After that, refunds are considered on a case-by-case basis for technical issues.'
  },
  {
    category: 'Community & Support',
    question: 'How quickly does support respond?',
    answer: 'We aim to respond as quickly as possible. Premium users receive priority support with faster response times. Response times may be longer during weekends and holidays. Urgent technical issues are prioritized.'
  }
];

const categories = [...new Set(faqData.map(item => item.category))];

export default function HelpFAQClient() {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title="Help & FAQ" backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">❓</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  How can we help you?
                </h1>
                <p className="text-muted-foreground">
                  Find answers to common questions about Dōshi Sensei
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === 'All'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    All Topics
                  </button>
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Items */}
              <div className="space-y-3">
                {filteredFAQ.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-muted-foreground">
                      No questions found matching your search.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try different keywords or browse all topics.
                    </p>
                  </div>
                ) : (
                  filteredFAQ.map((item, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(index)}
                        className="w-full px-4 py-4 flex items-start justify-between text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                              {item.category}
                            </span>
                          </div>
                          <h3 className="font-medium text-foreground">
                            {item.question}
                          </h3>
                        </div>
                        <div className="flex-shrink-0 mt-1">
                          <svg 
                            className="w-5 h-5 text-muted-foreground transition-transform duration-200" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            style={{ transform: expandedItems.has(index) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>
                      {expandedItems.has(index) && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Still Need Help Section */}
              <div className="mt-12 p-6 bg-muted/50 rounded-lg border border-border">
                <div className="text-center">
                  <div className="text-3xl mb-3">💬</div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Still need help?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Can't find what you're looking for? Our support team is here to help!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href="/contact?category=support"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Contact Support
                    </a>
                    <a
                      href="/contact?category=feedback"
                      className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      Send Feedback
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="/settings/privacy-policy"
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="text-2xl">🔒</div>
                  <div>
                    <p className="font-medium text-foreground">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground">How we protect your data</p>
                  </div>
                </a>
                <a
                  href="/settings/terms-of-service"
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="text-2xl">📋</div>
                  <div>
                    <p className="font-medium text-foreground">Terms of Service</p>
                    <p className="text-xs text-muted-foreground">Our terms and conditions</p>
                  </div>
                </a>
                <a
                  href="/settings/data-usage"
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="text-2xl">📊</div>
                  <div>
                    <p className="font-medium text-foreground">Data Usage</p>
                    <p className="text-xs text-muted-foreground">Transparency report</p>
                  </div>
                </a>
                <a
                  href="/contact?category=bug"
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="text-2xl">🐛</div>
                  <div>
                    <p className="font-medium text-foreground">Report a Bug</p>
                    <p className="text-xs text-muted-foreground">Help us improve</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}