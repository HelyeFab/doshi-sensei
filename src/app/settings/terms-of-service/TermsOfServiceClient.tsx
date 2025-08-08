'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function TermsOfServiceClient() {
  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Terms of Service" backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">📋</div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Terms of Service
              </h1>
              <p className="text-muted-foreground text-sm">
                Effective Date: January 8, 2025 | Version 2.0
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">1. Agreement to Terms</h2>
              <p className="text-muted-foreground">
                These Terms of Service ("Terms") constitute a legally binding agreement between you and Dōshi Sensei ("we," "us," or "our") regarding your use of our Japanese language learning application and related services (collectively, the "Service").
              </p>
              <p className="text-muted-foreground text-sm">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, you do not have permission to access the Service.
              </p>
              <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive-foreground">
                  <strong>Important:</strong> These Terms contain a binding arbitration clause and class action waiver, which affect your legal rights. Please read carefully.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">2. Eligibility and Account</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  To use our Service, you must:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Be at least 13 years old (or the minimum age in your jurisdiction)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Provide accurate and complete registration information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Maintain the security of your account credentials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Notify us immediately of any unauthorized access</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  You are responsible for all activities that occur under your account.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">3. Subscription and Payment</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground mb-2">3.1 Subscription Plans</h3>
                  <p className="text-sm text-muted-foreground">
                    We offer various subscription plans with different features and pricing. By subscribing, you agree to pay the applicable fees for your chosen plan.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">3.2 Billing</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground">Subscriptions automatically renew unless cancelled</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground">Payment is processed through Stripe, our payment provider</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-sm text-muted-foreground">Prices may change with advance notice</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">3.3 Refunds</h3>
                  <p className="text-sm text-muted-foreground">
                    We offer a money-back guarantee for new subscribers. After this period, refunds are provided at our discretion for technical issues or service failures.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use Policy</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground mb-2">4.1 Permitted Uses</h3>
                  <p className="text-sm text-muted-foreground mb-2">You may use our Service for:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span className="text-sm text-muted-foreground">Personal educational purposes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span className="text-sm text-muted-foreground">Classroom use by educators (with appropriate license)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span className="text-sm text-muted-foreground">Creating and sharing study materials within the platform</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-foreground mb-2">4.2 Prohibited Uses</h3>
                  <p className="text-sm text-muted-foreground mb-2">You agree NOT to:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Violate any laws or regulations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Infringe on intellectual property rights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Transmit malware, viruses, or harmful code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Attempt to gain unauthorized access to our systems</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Scrape, data mine, or use automated systems to access the Service</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Circumvent usage limits or access restrictions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Resell or commercially redistribute our content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Impersonate others or provide false information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span className="text-sm text-muted-foreground">Harass, abuse, or harm other users</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property Rights</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">5.1 Our Content</h3>
                  <p className="text-sm text-muted-foreground">
                    The Service and its original content (excluding user-generated content), features, and functionality are owned by Dōshi Sensei and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">5.2 Your Content</h3>
                  <p className="text-sm text-muted-foreground">
                    You retain ownership of content you create using our Service. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content solely for providing and improving the Service.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">5.3 Feedback</h3>
                  <p className="text-sm text-muted-foreground">
                    Any feedback, suggestions, or ideas you provide about the Service become our property and may be used without compensation or attribution.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">6. Third-Party Services and Content</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Our Service may contain links to third-party websites or services that are not owned or controlled by us. We have no control over and assume no responsibility for:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">The content, privacy policies, or practices of third-party services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">YouTube content accessed through our integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Payment processing through Stripe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">AI-generated content from OpenAI services</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">7. Disclaimers and Warranties</h2>
              <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                <p className="text-sm text-foreground font-medium mb-2">
                  IMPORTANT LEGAL DISCLAIMER:
                </p>
                <p className="text-sm text-muted-foreground">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  WE DO NOT WARRANT THAT:
                </p>
                <ul className="space-y-1 mt-2">
                  <li className="text-sm text-muted-foreground">• The Service will be uninterrupted or error-free</li>
                  <li className="text-sm text-muted-foreground">• Defects will be corrected</li>
                  <li className="text-sm text-muted-foreground">• The Service is free of viruses or harmful components</li>
                  <li className="text-sm text-muted-foreground">• The results from using the Service will meet your requirements</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
              <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                <p className="text-sm text-foreground font-medium mb-2">
                  LIMITATION OF LIABILITY:
                </p>
                <p className="text-sm text-muted-foreground">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DŌSHI SENSEI, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR:
                </p>
                <ul className="space-y-1 mt-2">
                  <li className="text-sm text-muted-foreground">• Any indirect, incidental, special, consequential, or punitive damages</li>
                  <li className="text-sm text-muted-foreground">• Loss of profits, data, use, goodwill, or other intangible losses</li>
                  <li className="text-sm text-muted-foreground">• Damages resulting from unauthorized access to or use of our servers</li>
                  <li className="text-sm text-muted-foreground">• Any interruption or cessation of transmission to or from the Service</li>
                  <li className="text-sm text-muted-foreground">• Any bugs, viruses, or similar transmitted through the Service</li>
                  <li className="text-sm text-muted-foreground">• Any errors or omissions in content</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Our total liability shall not exceed the amount paid by you, if any, for accessing the Service in the six months preceding the claim.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">9. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify, defend, and hold harmless Dōshi Sensei and its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Your access to or use of the Service</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Your violation of these Terms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Your violation of any third-party rights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm text-muted-foreground">Any content you submit or share through the Service</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">10. Termination</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Breach of these Terms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Request by law enforcement or government agencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Extended periods of inactivity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">Non-payment of fees</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which should reasonably survive termination shall survive.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">11. Dispute Resolution</h2>
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                <h3 className="font-medium text-foreground mb-2">11.1 Arbitration Agreement</h3>
                <p className="text-sm text-muted-foreground">
                  Any dispute arising from these Terms or your use of the Service shall be resolved through binding arbitration, except where prohibited by law. The arbitration shall be conducted under the rules of the American Arbitration Association.
                </p>
                
                <h3 className="font-medium text-foreground mb-2 mt-3">11.2 Class Action Waiver</h3>
                <p className="text-sm text-muted-foreground">
                  YOU AGREE THAT ANY CLAIMS SHALL BE BROUGHT SOLELY IN YOUR INDIVIDUAL CAPACITY AND NOT AS PART OF ANY CLASS ACTION OR REPRESENTATIVE PROCEEDING.
                </p>
                
                <h3 className="font-medium text-foreground mb-2 mt-3">11.3 Opt-Out</h3>
                <p className="text-sm text-muted-foreground">
                  You may opt out of arbitration by sending written notice within the opt-out period after first using the Service to: legal@doshisensei.com
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">13. Severability</h2>
              <p className="text-muted-foreground">
                If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions will continue in full force and effect.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">14. Entire Agreement</h2>
              <p className="text-muted-foreground">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and Dōshi Sensei regarding the use of our Service and supersede any prior agreements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">15. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will provide advance notice of material changes before they take effect. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">16. Contact Information</h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  For questions about these Terms of Service, please contact us:
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:legal@doshisensei.com" className="text-primary hover:underline">
                      legal@doshisensei.com
                    </a>
                  </p>
                  <p className="text-sm">
                    <strong className="text-foreground">Support:</strong>{' '}
                    <a href="mailto:support@doshisensei.com" className="text-primary hover:underline">
                      support@doshisensei.com
                    </a>
                  </p>
                  <p className="text-sm">
                    <strong className="text-foreground">Address:</strong> Dōshi Sensei, Legal Department<br />
                    [Your Company Address]<br />
                    [City, State/Country, Postal Code]
                  </p>
                </div>
              </div>
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
    </div>
  );
}
