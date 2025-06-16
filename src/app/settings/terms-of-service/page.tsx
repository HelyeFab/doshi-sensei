'use client';

import { PageHeader } from '@/components/PageHeader';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <PageHeader title="Terms of Service" />

      <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">📋</div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Terms of Service
              </h1>
              <p className="text-muted-foreground text-sm">
                Last updated: June 2025
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Doshi Sensei, you agree to be bound by these Terms of Service
                and all applicable laws and regulations.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Permitted Use</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <p className="font-medium text-foreground">Educational Purpose</p>
                    <p className="text-sm text-muted-foreground">
                      Use the app for learning Japanese language conjugations.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <p className="font-medium text-foreground">Personal Use</p>
                    <p className="text-sm text-muted-foreground">
                      Use the app for your own learning and practice.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-green-500 mt-1">✓</div>
                  <div>
                    <p className="font-medium text-foreground">Data Export</p>
                    <p className="text-sm text-muted-foreground">
                      Export your own learning data and progress.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Prohibited Activities</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1">✗</div>
                  <div>
                    <p className="font-medium text-foreground">Reverse Engineering</p>
                    <p className="text-sm text-muted-foreground">
                      Do not attempt to reverse engineer or decompile the app.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1">✗</div>
                  <div>
                    <p className="font-medium text-foreground">Commercial Redistribution</p>
                    <p className="text-sm text-muted-foreground">
                      Do not redistribute or sell the app or its content.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1">✗</div>
                  <div>
                    <p className="font-medium text-foreground">Harmful Activities</p>
                    <p className="text-sm text-muted-foreground">
                      Do not use the app for any illegal or harmful purposes.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Content and Data</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Your Data</h3>
                  <p className="text-sm text-muted-foreground">
                    You retain full ownership of any data you create or input into the app,
                    including word lists, progress data, and settings.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Educational Content</h3>
                  <p className="text-sm text-muted-foreground">
                    The Japanese language data and conjugation information is provided for
                    educational purposes and sourced from publicly available linguistic resources.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Disclaimer of Warranties</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  The app is provided "as is" without any warranties, express or implied.
                  We do not guarantee that the app will be error-free, uninterrupted, or
                  suitable for any particular purpose.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  In no event shall Doshi Sensei be liable for any indirect, incidental,
                  special, consequential, or punitive damages, including without limitation,
                  loss of profits or data, arising from your use of the app.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Open Source Components</h2>
              <p className="text-muted-foreground text-sm">
                This app uses open source components and libraries. Please see the
                Acknowledgments section in Settings for a full list of credits and licenses.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the app
                after any such changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p className="text-muted-foreground">
                If you have any questions about these terms, please contact us at{' '}
                <a
                  href="mailto:legal@doshi-sensei.app"
                  className="text-primary hover:underline"
                >
                  legal@doshi-sensei.app
                </a>
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl mb-2">🎌</div>
                <p className="text-sm text-muted-foreground">
                  がんばって！(Good luck with your Japanese studies!)
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
