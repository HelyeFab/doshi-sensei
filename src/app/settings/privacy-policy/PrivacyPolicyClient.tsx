'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function PrivacyPolicyClient() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title="Privacy Policy" backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🔒</div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Your Privacy Matters
              </h1>
              <p className="text-muted-foreground text-sm">
                Last updated: June 2025
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Privacy Commitment</h2>
              <p className="text-muted-foreground">
                Doshi Sensei is committed to protecting your privacy. This app has been designed
                with privacy as a core principle - your data stays with you.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Data Storage</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <p className="font-medium text-foreground">Local Storage Only</p>
                    <p className="text-sm text-muted-foreground">
                      All your data is stored locally on your device using browser storage.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <p className="font-medium text-foreground">No Server Storage</p>
                    <p className="text-sm text-muted-foreground">
                      We do not store your personal data, progress, or word lists on any servers.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <p className="font-medium text-foreground">You Control Your Data</p>
                    <p className="text-sm text-muted-foreground">
                      You can export, import, or delete all your data at any time.

export const metadata = {
  title: 'Privacy-policy',
  description: 'Privacy-policy - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  openGraph: {
    title: 'Privacy-policy | Doshi Sensei',
    description: 'Privacy-policy - The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  },
};
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">What We Don't Collect</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1">✗</div>
                  <div>
                    <p className="font-medium text-foreground">Personal Information</p>
                    <p className="text-sm text-muted-foreground">
                      No names, emails, or personal identifiers.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1">✗</div>
                  <div>
                    <p className="font-medium text-foreground">Usage Analytics</p>
                    <p className="text-sm text-muted-foreground">
                      No tracking of how you use the app.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1">✗</div>
                  <div>
                    <p className="font-medium text-foreground">Third-party Sharing</p>
                    <p className="text-sm text-muted-foreground">
                      Your data is never shared with anyone.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Local Data Types</h2>
              <p className="text-muted-foreground text-sm">
                The following types of data are stored locally on your device:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Learning progress and statistics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Custom word lists and saved words</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">App settings and preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Recently viewed words history</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p className="text-muted-foreground">
                If you have any questions about this privacy policy, please contact us at{' '}
                <a
                  href="mailto:privacy@doshi-sensei.app"
                  className="text-primary hover:underline"
                >
                  privacy@doshi-sensei.app
                </a>
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl mb-2">🙏</div>
                <p className="text-sm text-muted-foreground">
                  Thank you for trusting Doshi Sensei with your Japanese learning journey.
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
