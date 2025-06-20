import { ColorScheme } from './index';

export interface OnboardingState {
  currentScreen: number;
  isActive: boolean;
  hasCompleted: boolean;
  userInteractions: {
    demoWordClicked: boolean;
    listCreated: boolean;
    practiceStarted: boolean;
  };
  animationStates: {
    conjugationDemo: 'idle' | 'playing' | 'complete';
    listDemo: 'idle' | 'playing' | 'complete';
    practiceDemo: 'idle' | 'playing' | 'complete';
  };
}

export interface OnboardingSettings {
  selectedTheme: ColorScheme;
  showRomaji: boolean;
}

export interface OnboardingAnalytics {
  screenViews: Array<{
    screenIndex: number;
    screenName: string;
    timestamp: Date;
    timeSpent: number;
  }>;
  interactions: Array<{
    type: string;
    screenIndex: number;
    timestamp: Date;
  }>;
  completion: {
    completed: boolean;
    totalTime: number;
    interactionCount: number;
    dropOffScreen?: number;
  };
}
