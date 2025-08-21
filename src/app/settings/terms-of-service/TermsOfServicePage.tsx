'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useStrings } from '@/contexts/LanguageContext';

export default function TermsOfServicePage() {
  const strings = useStrings();
  const termsStrings = strings.settingsPages?.termsOfService;

  if (!termsStrings) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title={termsStrings.title} backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">📋</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {termsStrings.subtitle}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {termsStrings.effectiveDate}
                </p>
              </div>

              {/* 1. Acceptance of Terms */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.acceptance.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {termsStrings.sections.acceptance.content}
                </p>
              </section>

              {/* 2. Definitions */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.definitions.title}
                </h2>
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                  {Object.entries(termsStrings.sections.definitions.terms).map(([key, value]: [string, any]) => (
                    <p key={key} className="text-sm text-muted-foreground">
                      • {value}
                    </p>
                  ))}
                </div>
              </section>

              {/* 3. Eligibility */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.eligibility.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {termsStrings.sections.eligibility.content}
                </p>
              </section>

              {/* 4. Account Terms */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.accountTerms.title}
                </h2>
                <ul className="space-y-2 ml-4">
                  {termsStrings.sections.accountTerms.responsibilities.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 5. Acceptable Use Policy */}
              <section className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.acceptableUse.title}
                </h2>
                
                {/* Permitted Uses */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {termsStrings.sections.acceptableUse.permitted.title}
                  </h3>
                  <div className="space-y-2 ml-8">
                    {termsStrings.sections.acceptableUse.permitted.uses.map((use: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-sm text-muted-foreground">{use}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prohibited Uses */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    <span className="text-red-500">✗</span>
                    {termsStrings.sections.acceptableUse.prohibited.title}
                  </h3>
                  <div className="space-y-2 ml-8">
                    {termsStrings.sections.acceptableUse.prohibited.uses.map((use: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span className="text-sm text-muted-foreground">{use}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 6. Intellectual Property Rights */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.intellectualProperty.title}
                </h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">
                      {termsStrings.sections.intellectualProperty.ourRights.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {termsStrings.sections.intellectualProperty.ourRights.content}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">
                      {termsStrings.sections.intellectualProperty.yourRights.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {termsStrings.sections.intellectualProperty.yourRights.content}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <h4 className="font-medium text-foreground mb-2">
                      {termsStrings.sections.intellectualProperty.thirdPartyRights.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {termsStrings.sections.intellectualProperty.thirdPartyRights.content}
                    </p>
                  </div>
                </div>
              </section>

              {/* 7. User Content */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.userContent.title}
                </h2>
                <ul className="space-y-2 ml-4">
                  {termsStrings.sections.userContent.guidelines.map((guideline: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{guideline}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 8. Payments and Subscriptions */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.payments.title}
                </h2>
                <ul className="space-y-2 ml-4">
                  {termsStrings.sections.payments.terms.map((term: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{term}</span>
                    </li>
                  ))}
                </ul>
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg mt-4">
                  <p className="text-sm text-foreground">
                    <strong>Refund Policy:</strong> {termsStrings.sections.payments.refundPolicy}
                  </p>
                </div>
              </section>

              {/* 9. Privacy and Data Protection */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.privacyAndData.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {termsStrings.sections.privacyAndData.content}
                </p>
              </section>

              {/* 10. Disclaimers and Warranties */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.disclaimers.title}
                </h2>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {termsStrings.sections.disclaimers.content}
                  </p>
                  <ul className="space-y-1">
                    {termsStrings.sections.disclaimers.disclaimers.map((disclaimer: string, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {disclaimer}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 11. Limitation of Liability */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.limitationOfLiability.title}
                </h2>
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {termsStrings.sections.limitationOfLiability.content}
                  </p>
                  <ul className="space-y-1">
                    {termsStrings.sections.limitationOfLiability.exclusions.map((exclusion: string, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {exclusion}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 12. Indemnification */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.indemnification.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {termsStrings.sections.indemnification.content}
                </p>
              </section>

              {/* 13. Termination */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.termination.title}
                </h2>
                <p className="text-muted-foreground">
                  {termsStrings.sections.termination.content}
                </p>
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <strong>Effects of Termination:</strong> {termsStrings.sections.termination.effects}
                </p>
              </section>

              {/* 14. Governing Law and Disputes */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.governingLaw.title}
                </h2>
                <p className="text-muted-foreground">
                  {termsStrings.sections.governingLaw.content}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Exceptions:</strong> {termsStrings.sections.governingLaw.exceptions}
                </p>
              </section>

              {/* 15. Changes to Terms */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.changes.title}
                </h2>
                <p className="text-muted-foreground">
                  {termsStrings.sections.changes.content}
                </p>
                <ul className="space-y-2 ml-4">
                  {termsStrings.sections.changes.methods.map((method: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{method}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground mt-3 italic">
                  {termsStrings.sections.changes.continuation}
                </p>
              </section>

              {/* 16. General Provisions */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.generalProvisions.title}
                </h2>
                <div className="space-y-3">
                  {Object.entries(termsStrings.sections.generalProvisions.provisions).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </strong>{' '}
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 17. Contact Information */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {termsStrings.sections.contact.title}
                </h2>
                <p className="text-muted-foreground">
                  {termsStrings.sections.contact.content}
                </p>
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  {Object.entries(termsStrings.sections.contact.methods).map(([key, method]: [string, any]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground min-w-[80px]">
                        {method.label}:
                      </span>
                      {key === 'email' ? (
                        <a
                          href={`mailto:${method.value}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {method.value}
                        </a>
                      ) : key === 'form' ? (
                        <a
                          href="/contact?category=general"
                          className="text-sm text-primary hover:underline"
                        >
                          {method.value}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {method.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <div className="pt-8 border-t border-border">
                <div className="text-center">
                  <div className="text-3xl mb-3">🎌</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    がんばって！(Good luck with your Japanese studies!)
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {termsStrings.lastUpdated}
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
