'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function DataUsageClient() {
  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Data Usage & Transparency" backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">📊</div>
                <h1 className="text-xl font-semibold text-foreground mb-2">
                  How We Handle Your Data
                </h1>
                <p className="text-muted-foreground text-sm">
                  Full transparency about data collection and usage
                </p>
              </div>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Data We Collect</h2>
                
                <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                  <h3 className="font-medium text-foreground mb-3">Account Data</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-accent mt-1">📧</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Email Address</p>
                        <p className="text-xs text-muted-foreground">Used for: Authentication, account recovery, service notifications</p>
                        <p className="text-xs text-muted-foreground mt-1">Stored: Encrypted in Firebase Auth</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-accent mt-1">👤</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Display Name & Avatar</p>
                        <p className="text-xs text-muted-foreground">Used for: Personalization, user interface</p>
                        <p className="text-xs text-muted-foreground mt-1">Stored: Firebase Database</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-accent mt-1">🔐</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Authentication Tokens</p>
                        <p className="text-xs text-muted-foreground">Used for: Session management, API access</p>
                        <p className="text-xs text-muted-foreground mt-1">Stored: Encrypted cookies, short-term expiration</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <h3 className="font-medium text-foreground mb-3">Learning Data</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-primary mt-1">📚</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Study Progress</p>
                        <p className="text-xs text-muted-foreground">Includes: Completed lessons, quiz scores, practice history</p>
                        <p className="text-xs text-muted-foreground mt-1">Purpose: Track learning journey, provide recommendations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-primary mt-1">📝</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Custom Content</p>
                        <p className="text-xs text-muted-foreground">Includes: Word lists, notes, saved items</p>
                        <p className="text-xs text-muted-foreground mt-1">Purpose: Personalized learning experience</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-primary mt-1">⏱️</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Study Time & Patterns</p>
                        <p className="text-xs text-muted-foreground">Includes: Session duration, frequency, preferred study times</p>
                        <p className="text-xs text-muted-foreground mt-1">Purpose: Optimize learning schedule, send reminders</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/20">
                  <h3 className="font-medium text-foreground mb-3">Technical Data</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-secondary-foreground mt-1">🖥️</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Device Information</p>
                        <p className="text-xs text-muted-foreground">Includes: Browser type, OS, screen size, language settings</p>
                        <p className="text-xs text-muted-foreground mt-1">Purpose: Optimize display, fix compatibility issues</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-secondary-foreground mt-1">🐛</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Error Reports</p>
                        <p className="text-xs text-muted-foreground">Includes: Crash logs, error messages, stack traces</p>
                        <p className="text-xs text-muted-foreground mt-1">Purpose: Debug issues, improve stability</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-secondary-foreground mt-1">📈</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Usage Analytics</p>
                        <p className="text-xs text-muted-foreground">Includes: Page views, feature usage, click patterns</p>
                        <p className="text-xs text-muted-foreground mt-1">Purpose: Improve user experience, prioritize features</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Data Processing</h2>
                
                <div className="space-y-3">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How We Process Your Data</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span className="text-sm text-muted-foreground">All sensitive data is encrypted in transit using TLS 1.3</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span className="text-sm text-muted-foreground">Passwords are hashed using industry-standard bcrypt</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span className="text-sm text-muted-foreground">Database access is restricted with role-based permissions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span className="text-sm text-muted-foreground">Regular security audits and penetration testing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        <span className="text-sm text-muted-foreground">Automated backups with point-in-time recovery</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Data Anonymization</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      When we analyze usage patterns to improve our service:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-sm text-muted-foreground">Personal identifiers are removed or pseudonymized</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-sm text-muted-foreground">Data is aggregated across multiple users</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-sm text-muted-foreground">Individual learning paths cannot be traced back</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
                
                <div className="space-y-3">
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🔥</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">Firebase (Google)</h3>
                        <p className="text-xs text-muted-foreground mt-1">Authentication, database, hosting, analytics</p>
                        <p className="text-xs text-primary mt-2">
                          <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View Firebase Privacy Policy →
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💳</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">Stripe</h3>
                        <p className="text-xs text-muted-foreground mt-1">Payment processing, subscription management</p>
                        <p className="text-xs text-destructive mt-1">⚠️ We never see or store your credit card details</p>
                        <p className="text-xs text-primary mt-2">
                          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View Stripe Privacy Policy →
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🤖</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">OpenAI</h3>
                        <p className="text-xs text-muted-foreground mt-1">AI-powered features, content generation</p>
                        <p className="text-xs text-primary mt-1">✓ User data is anonymized before sending</p>
                        <p className="text-xs text-primary mt-2">
                          <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View OpenAI Privacy Policy →
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📺</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">YouTube API</h3>
                        <p className="text-xs text-muted-foreground mt-1">Video content, transcripts for shadowing practice</p>
                        <p className="text-xs text-primary mt-2">
                          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View Google Privacy Policy →
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Your Control</h2>
                
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <h3 className="font-medium text-foreground mb-3">You Can Always:</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Access Your Data</p>
                        <p className="text-xs text-muted-foreground">Download all your data in JSON format from Account Settings</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Correct Information</p>
                        <p className="text-xs text-muted-foreground">Update your profile and preferences anytime</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Delete Your Account</p>
                        <p className="text-xs text-muted-foreground">Permanently remove all your data promptly upon request</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Opt Out of Analytics</p>
                        <p className="text-xs text-muted-foreground">Disable anonymous usage tracking in Settings</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Control Cookies</p>
                        <p className="text-xs text-muted-foreground">Manage cookie preferences in your browser settings</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
                
                <div className="space-y-3">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">How Long We Keep Data</h3>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-2 text-muted-foreground">Account Data</td>
                          <td className="py-2 text-right font-medium">Until account deletion</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Learning Progress</td>
                          <td className="py-2 text-right font-medium">Until account deletion</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Session Data</td>
                          <td className="py-2 text-right font-medium">Short-term</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Error Logs</td>
                          <td className="py-2 text-right font-medium">Limited period</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Analytics Data</td>
                          <td className="py-2 text-right font-medium">Temporary (anonymized)</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Cached Content</td>
                          <td className="py-2 text-right font-medium">Short-term cache</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-muted-foreground">Deleted Account Data</td>
                          <td className="py-2 text-right font-medium">Grace period (then permanently deleted)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Questions?</h2>
                <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                  <p className="text-sm text-foreground mb-3">
                    We believe in complete transparency about data usage. If you have any questions or concerns:
                  </p>
                  <div className="space-y-2">
                    <a 
                      href="mailto:privacy@doshisensei.com" 
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <span>📧</span>
                      <span>privacy@doshisensei.com</span>
                    </a>
                    <a 
                      href="mailto:dpo@doshisensei.com" 
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <span>🛡️</span>
                      <span>dpo@doshisensei.com (Data Protection Officer)</span>
                    </a>
                  </div>
                </div>
              </section>

              <div className="pt-6 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl mb-2">🔐</div>
                  <p className="text-sm text-muted-foreground">
                    Your privacy and data security are our top priorities.
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