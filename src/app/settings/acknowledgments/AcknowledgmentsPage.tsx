'use client';

import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useStrings } from '@/contexts/LanguageContext';

export default function AcknowledgmentsPage() {
  const strings = useStrings();
  const ackStrings = strings.settingsPages?.acknowledgments;

  if (!ackStrings) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title={ackStrings.title} backHref="/settings" />

      <div className="container mx-auto px-4">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🙏</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {ackStrings.title}
                </h1>
                <p className="text-muted-foreground">
                  {ackStrings.subtitle}
                </p>
              </div>

              {/* Introduction */}
              <p className="text-center text-lg text-muted-foreground leading-relaxed">
                {ackStrings.intro}
              </p>

              {/* Core Technologies */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {ackStrings.sections.coreTechnologies.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(ackStrings.sections.coreTechnologies.items).map(([key, item]) => (
                    <div key={key} className="p-4 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground">{item.name}</h3>
                        {item.version && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {item.version}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.description}
                      </p>
                      <div className="flex justify-between items-center">
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {item.url.replace('https://', '')}
                          </a>
                        )}
                        {item.license && (
                          <span className="text-xs text-muted-foreground">
                            {item.license}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Japanese Language Data */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {ackStrings.sections.japaneseLanguageData.title}
                </h2>
                <div className="space-y-4">
                  {Object.entries(ackStrings.sections.japaneseLanguageData.items).map(([key, item]) => (
                    <div key={key} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="text-3xl flex-shrink-0">🇯🇵</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground mb-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description}
                        </p>
                        {item.note && (
                          <p className="text-xs text-muted-foreground italic mb-2">
                            {item.note}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {item.url.replace('https://', '')}
                          </a>
                          <span className="text-muted-foreground">
                            {item.license}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Development Tools */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {ackStrings.sections.developmentTools.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(ackStrings.sections.developmentTools.items).map(([key, item]) => (
                    <div key={key} className="p-4 bg-muted/20 rounded-lg">
                      <h3 className="font-medium text-foreground text-sm mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-primary">
                          {item.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.license}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* UI Libraries & Components */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {ackStrings.sections.uiLibraries.title}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(ackStrings.sections.uiLibraries.items).map(([key, item]) => (
                    <div key={key} className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                      <h4 className="font-medium text-sm text-foreground">
                        {item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                      <p className="text-xs text-primary mt-2">
                        {item.license}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Special Thanks */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {ackStrings.sections.specialThanks.title}
                </h2>
                <div className="space-y-3">
                  {ackStrings.sections.specialThanks.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 rounded-lg border border-yellow-500/20">
                      <div className="text-yellow-500 dark:text-yellow-400 text-lg mt-0.5">✨</div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* License Information */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {ackStrings.sections.licenses.title}
                </h2>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {ackStrings.sections.licenses.content}
                  </p>
                  {ackStrings.sections.licenses.note && (
                    <p className="text-sm text-foreground mt-3 font-medium">
                      📢 {ackStrings.sections.licenses.note}
                    </p>
                  )}
                </div>
              </section>

              {/* Footer */}
              <div className="pt-8 border-t border-border">
                <div className="text-center">
                  <div className="text-3xl mb-3">❤️</div>
                  <p className="text-lg text-foreground font-medium mb-2">
                    {ackStrings.footer.madeWith}
                  </p>
                  <p className="text-base text-muted-foreground mb-1">
                    {ackStrings.footer.tagline}
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    ({ackStrings.footer.taglineTranslation})
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