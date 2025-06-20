'use client';

import { TutorialButton } from '../components/TutorialButton';

export interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 p-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="text-6xl mb-4 animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to Doshi Sensei!
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Japanese verbs are like that friend who changes personality depending on the situation.
          <span className="font-semibold text-primary"> Don't worry—we speak their language! </span>
        </p>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary font-medium">
            🎯 Master 127+ conjugation forms<br/>
            📚 Create custom study lists<br/>
            ⚡ Practice with smart drills<br/>
            🏆 Track your progress like a ninja
          </p>
        </div>
      </div>

      {/* CTA */}
      <TutorialButton
        onClick={onNext}
        variant="primary"
        size="large"
        className="animate-pulse"
      >
        Let's Conjugate! 🚀
      </TutorialButton>

      <p className="text-xs text-muted-foreground">
        (Don't worry, no verbs were harmed in the making of this tutorial)
      </p>
    </div>
  );
}
