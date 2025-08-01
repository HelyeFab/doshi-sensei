'use client';

import SlideUpModal from '@/components/SlideUpModal';

interface ReviewResult {
  kanji: string;
  rating: number;
  nextReview: Date;
}

interface ReviewCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ReviewResult[];
  totalReviewed: number;
}

export default function ReviewCompleteModal({
  isOpen,
  onClose,
  results,
  totalReviewed
}: ReviewCompleteModalProps) {
  // Calculate statistics
  const perfectCount = results.filter(r => r.rating === 5).length;
  const goodCount = results.filter(r => r.rating >= 3).length;
  const hardCount = results.filter(r => r.rating <= 2).length;
  const averageRating = results.length > 0 
    ? results.reduce((sum, r) => sum + r.rating, 0) / results.length 
    : 0;

  // Format next review time
  const formatNextReview = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Later today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.ceil(days / 7)} weeks`;
    return `In ${Math.ceil(days / 30)} months`;
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      height="auto"
      showHandle={false}
      showCloseButton={true}
    >
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Review Complete!
          </h2>
          
          <p className="text-muted-foreground">
            Great job completing your review session
          </p>
        </div>

        {/* Statistics */}
        <div className="bg-muted/30 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-3">Session Summary</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{totalReviewed}</div>
              <div className="text-xs text-muted-foreground">Kanji Reviewed</div>
            </div>
            
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{averageRating.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Average Rating</div>
            </div>
            
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{perfectCount}</div>
              <div className="text-xs text-muted-foreground">Perfect Recalls</div>
            </div>
            
            <div className="bg-background rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{hardCount}</div>
              <div className="text-xs text-muted-foreground">Need More Practice</div>
            </div>
          </div>
        </div>

        {/* Next Reviews Preview */}
        {results.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-foreground mb-3">Next Reviews</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {results
                .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
                .slice(0, 5)
                .map((result, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                    <span className="text-lg font-medium text-foreground japanese-text">
                      {result.kanji}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatNextReview(result.nextReview)}
                    </span>
                  </div>
                ))}
            </div>
            {results.length > 5 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                And {results.length - 5} more...
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
          
          <button
            onClick={() => {
              // Could implement continue studying
              onClose();
            }}
            className="w-full py-3 px-4 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors"
          >
            Continue Studying
          </button>
        </div>
      </div>
    </SlideUpModal>
  );
}