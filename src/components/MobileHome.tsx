'use client';

import { strings } from '@/config/strings';
import Image from 'next/image';
import TypingEffect from './TypingEffect';

export default function MobileHome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mr-4">
            <span className="text-3xl font-bold text-primary-foreground japanese-text">動</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground app-name">
            {strings.appName}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground japanese-text mb-6">
          動詞 先生
        </p>
        <p className="text-base text-muted-foreground max-w-sm mx-auto">
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
