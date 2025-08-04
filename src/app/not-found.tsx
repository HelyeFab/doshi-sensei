'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStrings } from '@/contexts/LanguageContext';
import { useEffect, useState } from 'react';
import styles from './not-found.module.css';

export default function NotFound() {
  const { errors, common } = useStrings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating kanji characters */}
        {mounted && (
          <>
            <div className={`absolute top-10 left-10 text-4xl text-primary/10 ${styles.animateFloatSlow}`}>迷</div>
            <div className={`absolute top-20 right-20 text-3xl text-accent/10 ${styles.animateFloatMedium}`}>子</div>
            <div className={`absolute bottom-20 left-20 text-5xl text-primary/10 ${styles.animateFloatFast}`}>道</div>
            <div className={`absolute bottom-10 right-10 text-4xl text-accent/10 ${styles.animateFloatSlow}`}>先</div>
            <div className={`absolute top-1/3 left-1/4 text-3xl text-secondary/10 ${styles.animateFloatMedium}`}>生</div>
            <div className={`absolute top-1/2 right-1/3 text-4xl text-muted-foreground/10 ${styles.animateFloatFast}`}>404</div>
          </>
        )}
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Dōshi mascot with animation */}
        <div className="mb-8 relative">
          <div className={styles.animateBounceGentle}>
            <Image
              src="/doshi.png"
              alt="Dōshi Sensei looking confused"
              width={200}
              height={200}
              className="mx-auto filter drop-shadow-xl"
              priority
            />
          </div>
          {/* Question marks floating around Dōshi */}
          <div className={`absolute -top-4 -left-4 text-2xl text-primary ${styles.animateWiggle}`}>❓</div>
          <div className={`absolute -top-4 -right-4 text-2xl text-accent ${styles.animateWiggleDelayed}`}>❓</div>
          <div className={`absolute top-1/2 -left-8 text-xl text-secondary ${styles.animateWiggle}`}>❓</div>
          <div className={`absolute top-1/2 -right-8 text-xl text-muted-foreground ${styles.animateWiggleDelayed}`}>❓</div>
        </div>

        {/* 404 text with gradient */}
        <h1 className={`text-8xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent ${styles.animateGradient}`}>
          404
        </h1>

        {/* Japanese title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            あれ？道に迷っちゃった！
          </h2>
          <p className="text-xl text-muted-foreground">
            (Are? Michi ni mayochatta!)
          </p>
        </div>

        {/* Dōshi Sensei name with proper macron */}
        <div className="mb-8">
          <p className="text-lg text-foreground/80">
            <span className="font-bold text-primary">Dōshi Sensei</span> seems to have lost the way...
          </p>
        </div>

        {/* Error message */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-lg">
          <h3 className="text-xl font-semibold text-card-foreground mb-2">
            {errors.pageNotFound}
          </h3>
          <p className="text-muted-foreground">
            {errors.pageNotFoundDescription}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {common.goHome}
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Fun fact */}
        <div className="mt-12 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Fun fact:</span> In Japanese, "404" can be read as "yon-maru-yon" (四〇四), 
            but it doesn't have any special meaning like it does in web culture! 🎌
          </p>
        </div>
      </div>
    </div>
  );
}