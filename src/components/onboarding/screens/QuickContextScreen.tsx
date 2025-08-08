'use client';

import { useState } from 'react';
import { TutorialButton } from '../components/TutorialButton';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

export interface QuickContextScreenProps {
  onNext: () => void;
}

export function QuickContextScreen({ onNext }: QuickContextScreenProps) {
  const strings = useStrings();
  const [selectedDemo, setSelectedDemo] = useState(false);
  
  // Demo Japanese text for users to try
  const demoText = "勉強";
  const demoMeaning = "study";

  const handleDemoSelect = () => {
    setSelectedDemo(true);
    setTimeout(() => setSelectedDemo(false), 3000);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Hero Section */}
      <div className="relative mb-4">
        <motion.div 
          className="text-6xl md:text-7xl mb-4"
          animate={{ 
            rotate: selectedDemo ? [0, -10, 10, -10, 0] : 0,
            scale: selectedDemo ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.5 }}
        >
          <img src="/flat-icons/ui/quick-context/robot.svg" alt="QuickContext Helper" className="w-20 h-20 mx-auto" />
        </motion.div>
        <div className="absolute -top-2 -right-2 text-3xl animate-pulse">💡</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground">
          QuickContext Helper
        </h1>
        <p className="text-xl text-primary-foreground/90 leading-relaxed">
          Your instant Japanese learning assistant that appears whenever you select Japanese text!
        </p>
      </div>

      {/* Demo Section */}
      <div className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-lg p-6 max-w-md mx-auto shadow-lg">
        <p className="text-sm text-primary-foreground mb-4">
          Try it yourself! Select this Japanese word:
        </p>
        <div 
          className="relative inline-block"
          onClick={handleDemoSelect}
        >
          <span 
            className={`text-3xl font-ja font-bold cursor-pointer select-all px-4 py-2 rounded-lg transition-all ${
              selectedDemo 
                ? 'bg-yellow-300/30 text-yellow-100' 
                : 'text-primary-foreground hover:bg-primary-foreground/10'
            }`}
          >
            {demoText}
          </span>
          {selectedDemo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-3 py-1"
            >
              <span className="text-sm text-gray-800">{demoMeaning}</span>
            </motion.div>
          )}
        </div>
        <p className="text-xs text-primary-foreground/70 mt-4">
          (In the app, the helper bubble will appear with many features!)
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <FeatureCard icon="🔖" title="Save" description="Add to study lists" />
        <FeatureCard icon="🤖" title="AI Explain" description="Grammar & context" />
        <FeatureCard icon="🔍" title="Lookup" description="Dictionary search" />
        <FeatureCard icon="🔊" title="Listen" description="Hear pronunciation" />
        <FeatureCard icon="📋" title="Copy" description="Copy to clipboard" />
        <FeatureCard icon="🎯" title="Drag" description="Move anywhere" />
      </div>

      {/* Tips */}
      <div className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-lg p-4 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-primary-foreground mb-2">
          💡 Pro Tips:
        </h3>
        <ul className="text-xs text-primary-foreground/90 space-y-1 text-left">
          <li>• Works on ANY Japanese text throughout the app</li>
          <li>• Press <kbd className="px-1 py-0.5 bg-primary-foreground/20 rounded">Q</kbd> for quick save</li>
          <li>• Press <kbd className="px-1 py-0.5 bg-primary-foreground/20 rounded">Esc</kbd> to close</li>
          <li>• Drag the bubble to move it out of the way</li>
          <li>• Minimize to keep modals open while reading</li>
        </ul>
      </div>

      {/* CTA Button */}
      <TutorialButton 
        onClick={onNext} 
        variant="primary"
        size="medium"
        className="px-6 py-3 text-base font-semibold"
      >
        Continue Tour
      </TutorialButton>

      {/* Footer */}
      <p className="text-xs text-primary-foreground/70 italic">
        Select any Japanese text to get instant help!
      </p>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <h4 className="text-sm font-semibold text-primary-foreground">{title}</h4>
      <p className="text-xs text-primary-foreground/70">{description}</p>
    </div>
  );
}