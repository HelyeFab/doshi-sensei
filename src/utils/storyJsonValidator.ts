import { JLPTLevel, JLPT_LEVELS } from '@/types/kanji';
import { STORY_THEMES, STORY_TAGS } from '@/types/story';

export interface StoryJsonImport {
  title: string;
  titleJa: string;
  description?: string;
  jlptLevel: JLPTLevel;
  theme: string;
  tags?: string[];
  pages: Array<{
    pageNumber: number;
    text: string;
    translation: string;
    imageAlt?: string;
  }>;
  quiz?: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: StoryJsonImport;
}

export function validateStoryJson(jsonData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (!jsonData || typeof jsonData !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid JSON: Expected an object'],
      warnings: []
    };
  }

  // Required fields
  if (!jsonData.title || typeof jsonData.title !== 'string' || !jsonData.title.trim()) {
    errors.push('Missing or invalid "title" field (required, must be non-empty string)');
  }

  if (!jsonData.titleJa || typeof jsonData.titleJa !== 'string' || !jsonData.titleJa.trim()) {
    errors.push('Missing or invalid "titleJa" field (required, must be non-empty string)');
  }

  // JLPT Level validation
  if (!jsonData.jlptLevel) {
    errors.push('Missing "jlptLevel" field (required)');
  } else if (!JLPT_LEVELS.includes(jsonData.jlptLevel)) {
    errors.push(`Invalid "jlptLevel": "${jsonData.jlptLevel}". Must be one of: ${JLPT_LEVELS.join(', ')}`);
  }

  // Theme validation
  if (!jsonData.theme) {
    errors.push('Missing "theme" field (required)');
  } else if (!STORY_THEMES.includes(jsonData.theme)) {
    errors.push(`Invalid "theme": "${jsonData.theme}". Must be one of: ${STORY_THEMES.join(', ')}`);
  }

  // Pages validation
  if (!jsonData.pages || !Array.isArray(jsonData.pages)) {
    errors.push('Missing or invalid "pages" field (required, must be an array)');
  } else if (jsonData.pages.length === 0) {
    errors.push('Story must have at least one page');
  } else if (jsonData.pages.length > 20) {
    errors.push('Story cannot have more than 20 pages');
  } else {
    // Validate each page
    jsonData.pages.forEach((page: any, index: number) => {
      if (!page || typeof page !== 'object') {
        errors.push(`Page ${index + 1}: Invalid page format (must be an object)`);
        return;
      }

      if (typeof page.pageNumber !== 'number' || page.pageNumber !== index + 1) {
        warnings.push(`Page ${index + 1}: pageNumber should be ${index + 1} (will be auto-corrected)`);
      }

      if (!page.text || typeof page.text !== 'string' || !page.text.trim()) {
        errors.push(`Page ${index + 1}: Missing or empty "text" field`);
      }

      if (!page.translation || typeof page.translation !== 'string' || !page.translation.trim()) {
        errors.push(`Page ${index + 1}: Missing or empty "translation" field`);
      }

      // Check for ruby tags
      if (page.text && !page.text.includes('<ruby>')) {
        warnings.push(`Page ${index + 1}: Japanese text doesn't contain ruby tags for furigana`);
      }

      if (page.imageAlt && typeof page.imageAlt !== 'string') {
        warnings.push(`Page ${index + 1}: "imageAlt" should be a string`);
      }
    });
  }

  // Optional fields validation
  if (jsonData.description && typeof jsonData.description !== 'string') {
    warnings.push('"description" should be a string');
  }

  // Tags validation
  if (jsonData.tags) {
    if (!Array.isArray(jsonData.tags)) {
      warnings.push('"tags" should be an array');
    } else {
      jsonData.tags.forEach((tag: any, index: number) => {
        if (typeof tag !== 'string') {
          warnings.push(`Tag ${index + 1}: Should be a string`);
        } else if (!STORY_TAGS.includes(tag)) {
          warnings.push(`Tag "${tag}" is not in predefined tags list`);
        }
      });
    }
  }

  // Quiz validation
  if (jsonData.quiz) {
    if (!Array.isArray(jsonData.quiz)) {
      warnings.push('"quiz" should be an array');
    } else if (jsonData.quiz.length > 10) {
      errors.push('Quiz cannot have more than 10 questions');
    } else {
      jsonData.quiz.forEach((question: any, index: number) => {
        if (!question || typeof question !== 'object') {
          errors.push(`Quiz question ${index + 1}: Invalid format (must be an object)`);
          return;
        }

        if (!question.question || typeof question.question !== 'string' || !question.question.trim()) {
          errors.push(`Quiz question ${index + 1}: Missing or empty "question" field`);
        }

        if (!question.options || !Array.isArray(question.options)) {
          errors.push(`Quiz question ${index + 1}: Missing or invalid "options" field (must be an array)`);
        } else if (question.options.length !== 4) {
          errors.push(`Quiz question ${index + 1}: Must have exactly 4 options`);
        } else {
          question.options.forEach((option: any, optIndex: number) => {
            if (!option || typeof option !== 'string' || !option.trim()) {
              errors.push(`Quiz question ${index + 1}, option ${optIndex + 1}: Must be a non-empty string`);
            }
          });
        }

        if (typeof question.correctIndex !== 'number' || question.correctIndex < 0 || question.correctIndex > 3) {
          errors.push(`Quiz question ${index + 1}: "correctIndex" must be a number between 0 and 3`);
        }

        if (question.explanation && typeof question.explanation !== 'string') {
          warnings.push(`Quiz question ${index + 1}: "explanation" should be a string`);
        }
      });
    }
  }

  // SEO fields validation
  if (jsonData.seoTitle && typeof jsonData.seoTitle !== 'string') {
    warnings.push('"seoTitle" should be a string');
  }

  if (jsonData.seoDescription && typeof jsonData.seoDescription !== 'string') {
    warnings.push('"seoDescription" should be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? jsonData as StoryJsonImport : undefined
  };
}

export function parseStoryJson(file: File): Promise<{ data: any; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        resolve({ data });
      } catch (error) {
        resolve({ 
          data: null, 
          error: 'Failed to parse JSON file. Please ensure it\'s valid JSON format.' 
        });
      }
    };

    reader.onerror = () => {
      resolve({ 
        data: null, 
        error: 'Failed to read file. Please try again.' 
      });
    };

    reader.readAsText(file);
  });
}