'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function AcknowledgmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title="Acknowledgments" backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🙏</div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Acknowledgments
              </h1>
              <p className="text-muted-foreground text-sm">
                Built with amazing open source technologies
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Core Technologies</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl">⚛️</div>
                  <div>
                    <h3 className="font-medium text-foreground">WaniKani API</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      <a
                        href="https://www.wanikani.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        wanikani.com
                      </a>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Primary dictionary source providing high-quality Japanese vocabulary with learning context.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl">📚</div>
                  <div>
                    <h3 className="font-medium text-foreground">TypeScript</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Typed superset of JavaScript for better developer experience
                    </p>
                    <a
                      href="https://www.typescriptlang.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      typescriptlang.org
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Japanese Language Data</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl">🇯🇵</div>
                  <div>
                    <h3 className="font-medium text-foreground">WaniKani</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Comprehensive Japanese learning platform with high-quality vocabulary and kanji data
                    </p>
                    <a
                      href="https://www.wanikani.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      wanikani.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl">📚</div>
                  <div>
                    <h3 className="font-medium text-foreground">Jisho.org</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Japanese dictionary API for fallback vocabulary lookup
                    </p>
                    <a
                      href="https://jisho.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      jisho.org
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Primary Data Source:</strong> This app uses WaniKani as the primary source for Japanese vocabulary,
                    providing learner-focused content with structured progression. Jisho.org serves as a fallback dictionary
                    for comprehensive coverage when needed.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Development Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">ESLint</h3>
                  <p className="text-xs text-muted-foreground">Code linting</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Prettier</h3>
                  <p className="text-xs text-muted-foreground">Code formatting</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Jest</h3>
                  <p className="text-xs text-muted-foreground">Testing framework</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h3 className="font-medium text-foreground text-sm">Netlify</h3>
                  <p className="text-xs text-muted-foreground">Hosting platform</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Community & Inspiration</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-1">•</div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Japanese Language Learning Community</strong> -
                      For inspiration and feedback on language learning approaches
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-1">•</div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Open Source Contributors</strong> -
                      For making amazing tools and libraries freely available
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-1">•</div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Beta Testers</strong> -
                      For helping improve the app with valuable feedback
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">License Information</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This application is built using open source software under various licenses including MIT,
                  Apache 2.0, and Creative Commons. WaniKani data is accessed through their official API
                  under their terms of service. For detailed license information for each component,
                  please refer to the source code repository.
                </p>
              </div>
            </section>

            <div className="pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl mb-2">❤️</div>
                <p className="text-sm text-muted-foreground mb-2">
                  Built with love for Japanese learners worldwide
                </p>
                <p className="text-xs text-muted-foreground">
                  みんなで一緒に日本語を勉強しましょう！<br />
                  (Let's study Japanese together, everyone!)
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
