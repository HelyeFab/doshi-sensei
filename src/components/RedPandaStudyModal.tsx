'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface RedPandaStudyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  customMessage?: string;
}

const motivationalMessages = [
  "Hey there, knowledge seeker! 🎋 Ready to level up your Japanese today?",
  "Psst... Your brain cells are getting lonely without some kanji practice! 🧠",
  "The red panda of wisdom has spoken: Time to review! 🐾",
  "Did you know? Red pandas study Japanese too! (Probably) Let's join them! 📚",
  "Your future self will thank you for studying today! Future you says 'Arigatou!' 🌟",
  "Even this adorable red panda took a break from eating bamboo to remind you to study! 🎍",
  "Plot twist: This red panda knows more kanji than you... yet! Let's change that! 💪",
  "Studies show that 100% of successful Japanese learners... actually studied! Mind-blowing, right? 🤯",
  "The ancient scrolls say: 'Those who review daily, become legendary!' 📜",
  "Breaking news: Local red panda concerned about your study streak! 📰",
  "Fun fact: Every kanji you learn makes this red panda 10% happier! 😊",
  "Warning: Extreme cuteness ahead! Also, you should probably do your reviews... 🚨",
  "This red panda traveled all the way from the digital bamboo forest to see you study! 🌿",
  "Roses are red, pandas are too, time to review, it's good for you! 🌹",
  "Achievement unlocked: You opened the app! Now let's unlock some knowledge! 🏆"
];

export default function RedPandaStudyModal({ 
  isOpen, 
  onClose,
  customMessage 
}: RedPandaStudyModalProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const [message, setMessage] = useState(motivationalMessages[0]);
  const [isVisible, setIsVisible] = useState(false);

  // Load animation data
  useEffect(() => {
    if (isOpen && !animationData) {
      fetch('/red-panda/red-panda.json')
        .then(response => response.json())
        .then(data => setAnimationData(data))
        .catch(error => console.error('Failed to load red panda animation:', error));
    }
  }, [isOpen, animationData]);

  // Handle visibility with animation delay
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Randomly select a message when modal opens
  useEffect(() => {
    if (isOpen && !customMessage) {
      const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
      setMessage(motivationalMessages[randomIndex]);
    }
  }, [isOpen, customMessage]);

  const handleRedPandaClick = () => {
    // Navigate to review page
    window.location.href = '/review';
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal content */}
      <div 
        className={`relative z-10 flex flex-col items-center justify-center p-4 sm:p-8 transform transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red Panda Animation - Clickable */}
        <div 
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 relative cursor-pointer group"
          onClick={handleRedPandaClick}
          title="Click me to go to Review System!"
        >
          {animationData ? (
            <>
              <Lottie 
                animationData={animationData}
                loop={true}
                autoplay={true}
                className="w-full h-full transform transition-transform group-hover:scale-105"
              />
              {/* Hover indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Click to Review! 📚
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse text-white text-lg">
                Loading adorable red panda...
              </div>
            </div>
          )}
          
          {/* Subtle glow effect behind panda */}
          <div className="absolute inset-0 bg-gradient-radial from-orange-400/20 via-transparent to-transparent blur-2xl -z-10" />
        </div>
        
        {/* Motivational Message */}
        <div className="mt-6 max-w-md text-center space-y-4 animate-fadeInUp">
          <p className="text-white text-lg sm:text-xl md:text-2xl font-medium leading-relaxed drop-shadow-lg">
            {customMessage || message}
          </p>
          
          {/* Hint text */}
          <p className="text-white/70 text-sm mt-4 italic">
            💡 Tip: Click the red panda to jump to reviews, or click anywhere else to close
          </p>
        </div>
        
        {/* Fun floating elements - positioned around the modal */}
        <div className="absolute -top-8 left-4 sm:-top-10 sm:-left-10 text-3xl sm:text-4xl animate-bounce animation-delay-200">✨</div>
        <div className="absolute -top-4 right-2 sm:-top-5 sm:-right-8 text-2xl sm:text-3xl animate-bounce animation-delay-400">🌸</div>
        <div className="absolute -bottom-6 left-2 sm:-bottom-8 sm:-left-6 text-2xl sm:text-3xl animate-bounce animation-delay-600">🎋</div>
        <div className="absolute -bottom-8 right-4 sm:-bottom-10 sm:-right-10 text-3xl sm:text-4xl animate-bounce animation-delay-800">📚</div>
      </div>
    </div>
  );
}

// Add these styles to your global CSS or Tailwind config
const customStyles = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.6s ease-out;
}

.animation-delay-200 {
  animation-delay: 200ms;
}

.animation-delay-400 {
  animation-delay: 400ms;
}

.animation-delay-600 {
  animation-delay: 600ms;
}

.animation-delay-800 {
  animation-delay: 800ms;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
`;