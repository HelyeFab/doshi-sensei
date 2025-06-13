export const strings = {
  // App Info
  appName: "Doshi Sensei",
  appDescription: "Master Japanese verb and adjective conjugations",

  // Navigation
  nav: {
    home: "Home",
    practice: "Practice",
    drill: "Drill",
    vocab: "Vocabulary",
    settings: "Settings"
  },

  // Home Screen
  home: {
    title: "Welcome to Doshi Sensei",
    subtitle: "Master Japanese verb and adjective conjugations",
    practiceButton: "Practice Conjugations",
    drillButton: "Drill Mode",
    vocabButton: "Browse Vocabulary",
    settingsButton: "Settings"
  },

  // Practice Screen
  practice: {
    title: "Practice Mode",
    selectWord: "Select a word to practice",
    showConjugations: "Show All Conjugations",
    backToList: "Back to List"
  },

  // Drill Screen
  drill: {
    title: "Drill Mode",
    question: "Choose the correct conjugation:",
    correct: "Correct!",
    incorrect: "Incorrect. Try again!",
    showAnswer: "Show Answer",
    nextQuestion: "Next Question",
    score: "Score",
    showRules: "Show Rules",
    hideRules: "Hide Rules"
  },

  // Vocabulary Screen
  vocab: {
    title: "Vocabulary",
    searchPlaceholder: "Search by kanji, kana, or meaning...",
    filterByLevel: "Filter by JLPT Level",
    allLevels: "All Levels",
    noResults: "No words found",
    loading: "Loading vocabulary...",
    kanji: "Kanji",
    kana: "Kana",
    romaji: "Romaji",
    meaning: "Meaning",
    type: "Type",
    level: "JLPT Level"
  },

  // Conjugation Details
  conjugation: {
    title: "Conjugations",
    forms: {
      present: "Present",
      past: "Past",
      negative: "Negative",
      pastNegative: "Past Negative",
      polite: "Polite",
      politePast: "Polite Past",
      politeNegative: "Polite Negative",
      politePastNegative: "Polite Past Negative",
      teForm: "Te-form",
      potential: "Potential",
      passive: "Passive",
      causative: "Causative",
      conditional: "Conditional",
      volitional: "Volitional",
      imperative: "Imperative"
    }
  },

  // Settings Screen
  settings: {
    title: "Settings",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    language: "Display Language",
    showRomaji: "Show Romaji",
    dailyGoal: "Daily Goal",
    practiceReminders: "Practice Reminders",
    resetProgress: "Reset Progress",
    about: "About",
    version: "Version"
  },

  // Common
  common: {
    back: "Back",
    next: "Next",
    previous: "Previous",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    reset: "Reset",
    close: "Close",
    retry: "Retry",
    loading: "Loading...",
    error: "An error occurred",
    success: "Success!",
    of: "of"
  },

  // Word Types
  verbTypes: {
    ichidan: "Ichidan (る-verb)",
    godan: "Godan (う-verb)",
    irregular: "Irregular",
    "i-adjective": "い-adjective",
    "na-adjective": "な-adjective",
    noun: "Noun",
    adverb: "Adverb",
    particle: "Particle",
    other: "Other"
  },

  // JLPT Levels
  jlptLevels: {
    n5: "N5 (Beginner)",
    n4: "N4",
    n3: "N3",
    n2: "N2",
    n1: "N1 (Advanced)"
  },

  // Error Messages
  errors: {
    networkError: "Network error. Please check your connection.",
    loadError: "Failed to load data. Please try again.",
    invalidInput: "Invalid input. Please check your entry.",
    notFound: "Item not found.",
    serverError: "Server error. Please try again later."
  },

  // Conjugation Rules
  rules: {
    ichidan: {
      present: "Remove る and add appropriate ending",
      past: "Remove る and add た",
      negative: "Remove る and add ない",
      teForm: "Remove る and add て"
    },
    godan: {
      present: "Change final sound according to ending",
      past: "Change final sound and add た/だ",
      negative: "Change final sound to あ column and add ない",
      teForm: "Change final sound according to て-form rules"
    },
    irregular: {
      present: "Irregular conjugation - memorize forms",
      past: "Irregular conjugation - memorize forms",
      negative: "Irregular conjugation - memorize forms",
      teForm: "Irregular conjugation - memorize forms"
    }
  }
};

export type StringKeys = keyof typeof strings;
