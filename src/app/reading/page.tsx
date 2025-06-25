'use client';

import { PageHeader } from '@/components/PageHeader';
import CompanionTrigger from '@/components/CompanionTrigger';

// Temporarily blank page as requested
export default function ReadingPage() {
  return (
    <>
      {/* Virtual Companion Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
        <PageHeader title="Reading Practice" showBackButton={true} />

        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📖</div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Coming Soon
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Reading practice features are being developed. Check back soon for interactive reading exercises!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}