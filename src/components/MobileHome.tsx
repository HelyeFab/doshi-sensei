'use client';

import { strings } from '@/config/strings';
import Image from 'next/image';
import TypingEffect from './TypingEffect';

export default function MobileHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex flex-col items-center justify-center mb-3">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-primary-foreground japanese-text">動</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground app-name">
            {strings.appName}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground japanese-text mb-4">
          動詞 先生
        </p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {strings.home.subtitle}
        </p>
      </div>

      {/* Main Image */}
      <div className="relative w-full max-w-sm mx-auto mb-4">
        <Image
          src="/doshi.png"
          alt="Doshi Sensei"
          width={400}
          height={400}
          className="w-full h-auto rounded-lg shadow-lg"
          priority
        />
      </div>

      {/* Typing Effect */}
      <TypingEffect />
    </div>
  );
}
