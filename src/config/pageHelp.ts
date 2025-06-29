export interface PageHelp {
  title: string;
  description: string;
  tips?: string[];
}

export const pageHelpContent: Record<string, PageHelp> = {
  practice: {
    title: "Practice Mode",
    description: "Master Japanese verb and adjective conjugations through interactive practice. Choose between Kana Charts for visual learning or Conjugation Practice for hands-on training.",
    tips: [
      "Start with Kana Charts to familiarize yourself with different conjugation patterns",
      "Use Conjugation Practice to test your knowledge with real verbs and adjectives",
      "Practice regularly for 10-15 minutes daily to see the best results",
      "Focus on one conjugation type at a time before moving to the next"
    ]
  },
  
  vocabulary: {
    title: "Vocabulary",
    description: "Explore and learn Japanese words with detailed breakdowns, audio pronunciation, and example sentences. Search for any word to see its meanings, readings, and usage.",
    tips: [
      "Use romaji, hiragana, or kanji to search for words",
      "Click the speaker icon to hear native pronunciation",
      "Save frequently used words to your favorites for quick access",
      "Review the pitch accent patterns to improve your pronunciation"
    ]
  },
  
  stories: {
    title: "AI Stories",
    description: "Read engaging Japanese stories tailored to your level. Each story includes furigana support, vocabulary highlights, and interactive features to enhance your reading comprehension.",
    tips: [
      "Start with stories matching your JLPT level",
      "Click on any word to see its definition",
      "Use the audio feature to practice listening while reading",
      "Try reading the same story multiple times to improve fluency"
    ]
  },
  
  'kanji-moods': {
    title: "Kanji Mood Boards",
    description: "Learn kanji through beautifully designed mood boards that group characters by themes and visual patterns. A unique way to memorize kanji through association and context.",
    tips: [
      "Focus on one mood board theme at a time",
      "Study the visual connections between related kanji",
      "Practice writing the kanji to reinforce memory",
      "Review mood boards regularly to maintain retention"
    ]
  },
  
  games: {
    title: "Games",
    description: "Have fun while learning Japanese through interactive games. Challenge yourself with different game modes that test your vocabulary, grammar, and comprehension skills.",
    tips: [
      "Start with easier difficulty levels and progress gradually",
      "Play a variety of games to practice different skills",
      "Try to beat your previous scores to track improvement",
      "Use games as a fun break between serious study sessions"
    ]
  },
  
  'kanji-browser': {
    title: "Kanji Browser",
    description: "Browse and study kanji characters systematically by grade level or JLPT level. See stroke order, readings, meanings, and example words for each character.",
    tips: [
      "Study kanji in order of Japanese school grades for structured learning",
      "Focus on kun'yomi and on'yomi readings",
      "Practice writing kanji following the correct stroke order",
      "Learn kanji compounds to expand your vocabulary"
    ]
  },
  
  news: {
    title: "News Articles",
    description: "Read real Japanese news articles adapted for learners. Stay informed about current events while improving your reading skills with articles from trusted sources.",
    tips: [
      "Read articles daily to build consistency",
      "Start with NHK Easy News for simpler language",
      "Look up unfamiliar words to build vocabulary",
      "Try summarizing articles in your own words"
    ]
  },
  
  drill: {
    title: "Drill Practice",
    description: "Intensive practice sessions designed to reinforce your Japanese skills through repetition and active recall. Perfect for exam preparation or focused study.",
    tips: [
      "Set specific goals for each drill session",
      "Focus on your weak areas for maximum improvement",
      "Take breaks between drill sessions to avoid fatigue",
      "Track your progress over time to see improvement"
    ]
  },
  
  resources: {
    title: "Resources",
    description: "Access curated learning materials, guides, and blog posts about Japanese language and culture. Find helpful tips and in-depth explanations to support your learning journey.",
    tips: [
      "Bookmark resources you find particularly helpful",
      "Read guides that match your current learning goals",
      "Apply tips from blog posts to your study routine",
      "Check back regularly for new content"
    ]
  },
  
  settings: {
    title: "Settings",
    description: "Customize your learning experience by adjusting app preferences, managing your account, and configuring study options to match your learning style.",
    tips: [
      "Set your JLPT level for appropriate content difficulty",
      "Choose your preferred theme for comfortable viewing",
      "Enable notifications to maintain study streaks",
      "Adjust audio settings for pronunciation practice"
    ]
  },
  
  account: {
    title: "Account",
    description: "Manage your profile, subscription, and learning progress. Track your achievements and customize your learning journey.",
    tips: [
      "Keep your profile updated with your current level",
      "Review your progress statistics regularly",
      "Set learning goals to stay motivated",
      "Manage your subscription for premium features"
    ]
  },
  
  favourites: {
    title: "Favourites",
    description: "Access your saved words, kanji, and content for quick review. Build your personal collection of Japanese learning materials.",
    tips: [
      "Organize favorites by categories for easy access",
      "Review saved items regularly for better retention",
      "Remove items you've mastered to keep the list relevant",
      "Use favorites for quick pre-test reviews"
    ]
  }
};