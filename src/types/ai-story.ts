import { JLPTLevel } from './kanji';
import { StoryPage } from './story';

export interface AICharacterSheet {
  mainCharacter: {
    name: string;
    nameJa: string;
    description: string;
    visualDescription: string;
  };
  supportingCharacters: Array<{
    name: string;
    nameJa: string;
    description: string;
    visualDescription: string;
  }>;
  setting: {
    location: string;
    time: string;
    atmosphere: string;
  };
  visualStyle: string;
  saveForReuse?: boolean; // Flag to save character sheet for future stories
}

export interface AIStoryOutline {
  pageNumber: number;
  summary: string;
  imagePrompt: string;
}

export interface AIStoryGenerationRequest {
  theme: string;
  jlptLevel: JLPTLevel;
  pages: number;
  useExistingCharacterSheet?: string; // ID of saved character sheet
}

export interface AIStoryDraft {
  id: string;
  title: string;
  titleJa: string;
  description: string;
  theme: string;
  jlptLevel: JLPTLevel;
  characterSheet: AICharacterSheet;
  outline: AIStoryOutline[];
  pages: StoryPage[];
  generationPrompts: {
    characterPrompt?: string;
    outlinePrompt?: string;
    pagePrompts?: Record<number, string>;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string; // admin user ID
    openAiModel: string;
    totalTokensUsed?: number;
    totalCost?: number;
    isAIGenerated: boolean;
  };
  status: 'generating' | 'draft' | 'review' | 'published';
  currentGenerationStep?: number;
  totalGenerationSteps?: number;
}

export interface AIGenerationProgress {
  step: 'character_sheet' | 'outline' | 'pages' | 'images' | 'quiz' | 'complete';
  currentPage?: number;
  totalPages?: number;
  message: string;
  error?: string;
}

export interface SavedCharacterSheet {
  id: string;
  name: string; // Display name for the character sheet
  characterSheet: AICharacterSheet;
  usedInStories: string[]; // Story IDs
  createdAt: Date;
  createdBy: string;
  tags?: string[];
}