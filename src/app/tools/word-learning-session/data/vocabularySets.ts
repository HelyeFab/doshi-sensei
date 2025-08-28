import { VocabularySet } from '../types';

// Sample vocabulary for Genki I Lesson 1
const genkiLesson1: VocabularySet = {
  id: 'genki1-lesson1',
  name: 'Genki I - Lesson 1',
  type: 'vocabulary',
  words: [
    {
      id: 'genki1_1_1',
      kana: 'あの',
      meaning: 'um...',
      partOfSpeech: 'interjection',
      example: {
        japanese: 'あの、すみません。',
        reading: 'あの、すみません。',
        english: 'Um, excuse me.'
      }
    },
    {
      id: 'genki1_1_2',
      kana: 'いま',
      kanji: '今',
      meaning: 'now',
      partOfSpeech: 'noun',
      example: {
        japanese: '今、何時ですか。',
        reading: 'いま、なんじですか。',
        english: 'What time is it now?'
      }
    },
    {
      id: 'genki1_1_3',
      kana: 'えいご',
      kanji: '英語',
      meaning: 'English (language)',
      partOfSpeech: 'noun',
      example: {
        japanese: '英語を話しますか。',
        reading: 'えいごをはなしますか。',
        english: 'Do you speak English?'
      }
    },
    {
      id: 'genki1_1_4',
      kana: 'がくせい',
      kanji: '学生',
      meaning: 'student',
      partOfSpeech: 'noun',
      example: {
        japanese: '私は学生です。',
        reading: 'わたしはがくせいです。',
        english: 'I am a student.'
      }
    },
    {
      id: 'genki1_1_5',
      kana: 'こうこう',
      kanji: '高校',
      meaning: 'high school',
      partOfSpeech: 'noun',
      example: {
        japanese: '高校の先生です。',
        reading: 'こうこうのせんせいです。',
        english: 'I am a high school teacher.'
      }
    },
    {
      id: 'genki1_1_6',
      kana: 'ごご',
      kanji: '午後',
      meaning: 'P.M.',
      partOfSpeech: 'noun',
      example: {
        japanese: '午後三時です。',
        reading: 'ごごさんじです。',
        english: "It's 3 P.M."
      }
    },
    {
      id: 'genki1_1_7',
      kana: 'ごぜん',
      kanji: '午前',
      meaning: 'A.M.',
      partOfSpeech: 'noun',
      example: {
        japanese: '午前九時です。',
        reading: 'ごぜんくじです。',
        english: "It's 9 A.M."
      }
    },
    {
      id: 'genki1_1_8',
      kana: 'さい',
      kanji: '歳',
      meaning: '...years old',
      partOfSpeech: 'counter',
      example: {
        japanese: '二十歳です。',
        reading: 'はたちです。',
        english: 'I am 20 years old.'
      }
    },
    {
      id: 'genki1_1_9',
      kana: 'さん',
      meaning: 'Mr./Ms.',
      partOfSpeech: 'title',
      example: {
        japanese: '田中さんです。',
        reading: 'たなかさんです。',
        english: 'This is Mr./Ms. Tanaka.'
      }
    },
    {
      id: 'genki1_1_10',
      kana: 'じ',
      kanji: '時',
      meaning: "o'clock",
      partOfSpeech: 'counter',
      example: {
        japanese: '三時です。',
        reading: 'さんじです。',
        english: "It's 3 o'clock."
      }
    }
  ]
};

// Sample vocabulary for Genki I Lesson 2
const genkiLesson2: VocabularySet = {
  id: 'genki1-lesson2',
  name: 'Genki I - Lesson 2',
  type: 'vocabulary',
  words: [
    {
      id: 'genki1_2_1',
      kana: 'これ',
      meaning: 'this one',
      partOfSpeech: 'pronoun',
      example: {
        japanese: 'これは本です。',
        reading: 'これはほんです。',
        english: 'This is a book.'
      }
    },
    {
      id: 'genki1_2_2',
      kana: 'それ',
      meaning: 'that one',
      partOfSpeech: 'pronoun',
      example: {
        japanese: 'それは何ですか。',
        reading: 'それはなんですか。',
        english: 'What is that?'
      }
    },
    {
      id: 'genki1_2_3',
      kana: 'あれ',
      meaning: 'that one (over there)',
      partOfSpeech: 'pronoun',
      example: {
        japanese: 'あれは私の車です。',
        reading: 'あれはわたしのくるまです。',
        english: 'That (over there) is my car.'
      }
    },
    {
      id: 'genki1_2_4',
      kana: 'この',
      meaning: 'this...',
      partOfSpeech: 'adjective',
      example: {
        japanese: 'この本は面白いです。',
        reading: 'このほんはおもしろいです。',
        english: 'This book is interesting.'
      }
    },
    {
      id: 'genki1_2_5',
      kana: 'その',
      meaning: 'that...',
      partOfSpeech: 'adjective',
      example: {
        japanese: 'そのペンをください。',
        reading: 'そのペンをください。',
        english: 'Please give me that pen.'
      }
    }
  ]
};

// Vocabulary set registry
const vocabularySets: Record<string, VocabularySet> = {
  'genki1-lesson1': genkiLesson1,
  'genki1-lesson2': genkiLesson2,
  // More lessons will be added here
};

export async function getVocabularySet(setId: string): Promise<VocabularySet | null> {
  // In the future, this could fetch from a database or API
  return vocabularySets[setId] || null;
}

export function getAvailableSets(): { id: string; name: string }[] {
  return Object.values(vocabularySets).map(set => ({
    id: set.id,
    name: set.name
  }));
}