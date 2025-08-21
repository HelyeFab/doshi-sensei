'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function PrivacyPolicyClient() {
  return (
    <div className="min-h-screen bg-background">
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
                Last updated: January 8, 2025 | Version 2.0
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to Dōshi Sensei ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Japanese language learning application.
              </p>
              <p className="text-muted-foreground text-sm">
                By using Dōshi Sensei, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">2.1 Information You Provide</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Account Information:</strong> Email address, display name, and profile picture when you create an account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Learning Data:</strong> Your progress, saved vocabulary, practice results, and study preferences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>User Content:</strong> Notes, custom word lists, and any content you create within the app</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Communications:</strong> Feedback, support requests, and correspondence with us</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">2.2 Information Collected Automatically</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Device Information:</strong> Browser type, operating system, device type, and unique device identifiers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Usage Data:</strong> Features used, time spent, pages visited, and interaction patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Performance Data:</strong> Crash reports, error logs, and performance metrics</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">2.3 Third-Party Services</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    We use the following third-party services that may collect information:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Firebase (Google):</strong> Authentication, database, and analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>Stripe:</strong> Payment processing (no credit card details stored by us)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>OpenAI:</strong> AI-powered features (content anonymized)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground"><strong>YouTube API:</strong> Video content integration</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground text-sm">
                We use the information we collect to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Provide and maintain our language learning services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Personalize your learning experience and track progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Process transactions and manage subscriptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Send service-related notifications and updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Respond to support requests and feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Improve our services through analytics and research</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-sm text-muted-foreground">Comply with legal obligations and protect our rights</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">4. Data Storage and Security</h2>
              <div className="space-y-3">
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <h3 className="font-medium text-foreground mb-2">Our Security Measures</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">🔒</span>
                      <span className="text-sm text-muted-foreground">End-to-end encryption for sensitive data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">🔒</span>
                      <span className="text-sm text-muted-foreground">Secure HTTPS connections for all data transfers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">🔒</span>
                      <span className="text-sm text-muted-foreground">Regular security audits and vulnerability assessments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">🔒</span>
                      <span className="text-sm text-muted-foreground">Access controls and authentication mechanisms</span>
                    </li>
                  </ul>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  <strong>Data Location:</strong> Your data is stored on secure servers provided by Google Firebase, located in the United States. For users in the European Union, data may be transferred internationally in compliance with applicable data protection laws.
                </p>
                
                <p className="text-sm text-muted-foreground">
                  <strong>Local Storage:</strong> Some data is stored locally on your device for offline access and performance optimization. This includes cached content, preferences, and recent activity.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">5. Data Sharing and Disclosure</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  We do not sell, trade, or rent your personal information. We may share your information only in the following circumstances:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground"><strong>Service Providers:</strong> With trusted third parties who assist in operating our services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground"><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground"><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground"><strong>With Consent:</strong> When you explicitly agree to such sharing</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">6. Your Rights and Choices</h2>
              <div className="space-y-3">
                <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                  <h3 className="font-medium text-foreground mb-2">You have the right to:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-sm text-muted-foreground"><strong>Access:</strong> Request a copy of your personal data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-sm text-muted-foreground"><strong>Correct:</strong> Update or correct inaccurate information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-sm text-muted-foreground"><strong>Delete:</strong> Request deletion of your account and data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-sm text-muted-foreground"><strong>Export:</strong> Download your data in a portable format</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-sm text-muted-foreground"><strong>Opt-out:</strong> Unsubscribe from marketing communications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span>
                      <span className="text-sm text-muted-foreground"><strong>Restrict:</strong> Limit processing of your data in certain circumstances</span>
                    </li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  To exercise any of these rights, please contact us at privacy@doshisensei.com or through your account settings.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">7. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground text-sm">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground"><strong>Essential Cookies:</strong> Required for basic site functionality and security</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground"><strong>Preference Cookies:</strong> Remember your settings and preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground"><strong>Analytics Cookies:</strong> Help us understand how users interact with our service</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                You can control cookies through your browser settings. Note that disabling certain cookies may limit functionality.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">9. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy and applicable laws.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">10. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal information within a reasonable timeframe, except where retention is required by law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">11. California Privacy Rights (CCPA)</h2>
              <p className="text-muted-foreground text-sm">
                California residents have additional rights under the CCPA, including the right to know what personal information is collected, used, shared, or sold. For more information or to exercise your rights, please contact us.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">12. European Privacy Rights (GDPR)</h2>
              <p className="text-muted-foreground text-sm">
                If you are in the European Economic Area (EEA), you have additional rights under the GDPR, including the right to data portability and the right to lodge a complaint with your local supervisory authority.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">13. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">14. Contact Information</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  If you have questions or concerns about this privacy policy or our data practices, please contact us:
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:privacy@doshisensei.com" className="text-primary hover:underline">
                      privacy@doshisensei.com
                    </a>
                  </p>
                  <p className="text-sm">
                    <strong className="text-foreground">Data Protection Officer:</strong>{' '}
                    <a href="mailto:dpo@doshisensei.com" className="text-primary hover:underline">
                      dpo@doshisensei.com
                    </a>
                  </p>
                  <p className="text-sm">
                    <strong className="text-foreground">Address:</strong> Dōshi Sensei, Privacy Department<br />
                    [Your Company Address]<br />
                    [City, State/Country, Postal Code]
                  </p>
                </div>
              </div>
            </section>

            <div className="pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl mb-2">🙏</div>
                <p className="text-sm text-muted-foreground">
                  Thank you for trusting Dōshi Sensei with your Japanese learning journey.
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
