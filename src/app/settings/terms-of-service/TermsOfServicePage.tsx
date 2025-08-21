'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useStrings } from '@/contexts/LanguageContext';

export default function TermsOfServicePage() {
  const strings = useStrings();
  const pageTitle = strings.settingsPages?.pages?.termsOfService || 'Terms of Service';

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title={pageTitle} backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">📋</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {pageTitle}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Effective Date: January 1, 2025
                </p>
              </div>

              {/* Terms Content */}
              <section className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    1. Agreement to Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using Dōshi Sensei ("the Service"), you agree to be bound by these Terms of Service. 
                    If you do not agree to these terms, please do not use the Service.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    2. Use of Service
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Dōshi Sensei is an educational platform designed to help users learn Japanese. 
                    The Service is provided for personal, non-commercial use only. You agree to use the Service 
                    in accordance with all applicable laws and regulations.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    3. User Accounts
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You are responsible for maintaining the confidentiality of your account credentials and 
                    for all activities that occur under your account. You agree to notify us immediately of 
                    any unauthorized use of your account.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    4. Content and Intellectual Property
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    All content provided through the Service, including text, graphics, and educational materials, 
                    is protected by copyright and other intellectual property laws. You may not reproduce, distribute, 
                    or create derivative works without our express written permission.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    5. Privacy
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Your use of the Service is also governed by our Privacy Policy. We respect your privacy and 
                    are committed to protecting your personal information.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    6. Subscriptions and Payments
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Some features of the Service require a paid subscription. Subscription fees are billed in advance 
                    on a monthly or annual basis. You may cancel your subscription at any time through your account settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    7. Disclaimers and Limitations
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The Service is provided "as is" without warranties of any kind. While we strive to provide 
                    accurate and helpful educational content, we do not guarantee the accuracy, completeness, or 
                    usefulness of any information provided through the Service.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    8. Changes to Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We reserve the right to modify these Terms of Service at any time. We will notify users of 
                    any material changes. Your continued use of the Service after such changes constitutes your 
                    acceptance of the new terms.
                  </p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    9. Contact Information
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us through the 
                    contact form available in the application.
                  </p>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center mt-12 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Acknowledgment:</strong> By using Dōshi Sensei, you acknowledge that you have read, 
                  understood, and agree to be bound by these Terms of Service.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  © 2025 Dōshi Sensei. All rights reserved.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Last Updated:</strong> January 1, 2025
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}