'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useStrings } from '@/contexts/LanguageContext';

export default function PrivacyPolicyPage() {
  const strings = useStrings();
  const privacyStrings = strings.settingsPages?.privacyPolicy;

  if (!privacyStrings) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title={privacyStrings.title} backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {privacyStrings.subtitle}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {privacyStrings.effectiveDate}
                </p>
              </div>

              {/* Introduction */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.introduction.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {privacyStrings.sections.introduction.content}
                </p>
              </section>

              {/* Privacy Commitment */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.privacyCommitment.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {privacyStrings.sections.privacyCommitment.content}
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  {privacyStrings.sections.privacyCommitment.principles.map((principle, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="text-primary mt-0.5">✓</div>
                      <p className="text-sm text-foreground">{principle}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Information Collection */}
              <section className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.informationCollection.title}
                </h2>
                
                {/* Local Data */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">
                    {privacyStrings.sections.informationCollection.subsections.localData.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {privacyStrings.sections.informationCollection.subsections.localData.description}
                  </p>
                  <ul className="space-y-2 ml-4">
                    {privacyStrings.sections.informationCollection.subsections.localData.items.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Account Data */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">
                    {privacyStrings.sections.informationCollection.subsections.accountData.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {privacyStrings.sections.informationCollection.subsections.accountData.description}
                  </p>
                  <ul className="space-y-2 ml-4">
                    {privacyStrings.sections.informationCollection.subsections.accountData.items.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Automatic Data */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">
                    {privacyStrings.sections.informationCollection.subsections.automaticData.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {privacyStrings.sections.informationCollection.subsections.automaticData.description}
                  </p>
                  <ul className="space-y-2 ml-4">
                    {privacyStrings.sections.informationCollection.subsections.automaticData.items.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Data Usage */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.dataUsage.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.dataUsage.content}
                </p>
                <ul className="space-y-2 ml-4">
                  {privacyStrings.sections.dataUsage.purposes.map((purpose, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{purpose}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Data Sharing */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.dataSharing.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.dataSharing.content}
                </p>
                <ul className="space-y-2 ml-4">
                  {privacyStrings.sections.dataSharing.circumstances.map((circumstance, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{circumstance}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">
                    {privacyStrings.sections.dataSharing.serviceProviders.title}
                  </h4>
                  <ul className="space-y-1">
                    {privacyStrings.sections.dataSharing.serviceProviders.list.map((provider, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {provider}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Data Security */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.dataSecurity.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.dataSecurity.content}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {privacyStrings.sections.dataSecurity.measures.map((measure, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="text-green-600 dark:text-green-400 mt-0.5">🛡️</div>
                      <span className="text-sm text-foreground">{measure}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Data Retention */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.dataRetention.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.dataRetention.content}
                </p>
                <ul className="space-y-2 ml-4">
                  {privacyStrings.sections.dataRetention.policies.map((policy, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{policy}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* User Rights */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.userRights.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.userRights.content}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {privacyStrings.sections.userRights.rights.map((right, index) => {
                    const [label, description] = right.split(' - ');
                    return (
                      <div key={index} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="font-medium text-sm text-foreground mb-1">{label}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                  {privacyStrings.sections.userRights.howTo}
                </p>
              </section>

              {/* Children's Privacy */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.childrenPrivacy.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {privacyStrings.sections.childrenPrivacy.content}
                </p>
              </section>

              {/* Cookies */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.cookies.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.cookies.content}
                </p>
                <ul className="space-y-2 ml-4">
                  {privacyStrings.sections.cookies.uses.map((use, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{use}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground italic mt-2">
                  {privacyStrings.sections.cookies.note}
                </p>
              </section>

              {/* International Users */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.internationalUsers.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {privacyStrings.sections.internationalUsers.content}
                </p>
              </section>

              {/* Changes to Policy */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.changes.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.changes.content}
                </p>
                <ul className="space-y-2 ml-4">
                  {privacyStrings.sections.changes.methods.map((method, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-sm text-muted-foreground">{method}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Contact */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {privacyStrings.sections.contact.title}
                </h2>
                <p className="text-muted-foreground">
                  {privacyStrings.sections.contact.content}
                </p>
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground min-w-[80px]">
                      {privacyStrings.sections.contact.methods.email.label}:
                    </span>
                    <a
                      href={`mailto:${privacyStrings.sections.contact.methods.email.value}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {privacyStrings.sections.contact.methods.email.value}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground min-w-[80px]">
                      {privacyStrings.sections.contact.methods.form.label}:
                    </span>
                    <a
                      href="/contact?category=general"
                      className="text-sm text-primary hover:underline"
                    >
                      {privacyStrings.sections.contact.methods.form.value}
                    </a>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  {privacyStrings.sections.contact.responseTime}
                </p>
              </section>

              {/* Footer */}
              <div className="pt-8 border-t border-border">
                <div className="text-center">
                  <div className="text-3xl mb-3">🙏</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Thank you for trusting Dōshi Sensei with your Japanese learning journey.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {privacyStrings.lastUpdated}
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
