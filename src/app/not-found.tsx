import Link from 'next/link';

export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating kanji characters - using CSS animations only */}
        <div className="absolute top-10 left-10 text-4xl text-primary/10 animate-pulse">迷</div>
        <div className="absolute top-20 right-20 text-3xl text-accent/10 animate-pulse" style={{ animationDelay: '0.5s' }}>子</div>
        <div className="absolute bottom-20 left-20 text-5xl text-primary/10 animate-pulse" style={{ animationDelay: '1s' }}>道</div>
        <div className="absolute bottom-10 right-10 text-4xl text-accent/10 animate-pulse" style={{ animationDelay: '1.5s' }}>先</div>
        <div className="absolute top-1/3 left-1/4 text-3xl text-secondary/10 animate-pulse" style={{ animationDelay: '2s' }}>生</div>
        <div className="absolute top-1/2 right-1/3 text-4xl text-muted-foreground/10 animate-pulse" style={{ animationDelay: '2.5s' }}>404</div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Dōshi mascot with animation */}
        <div className="mb-8 relative">
          <div className="animate-bounce">
            <img
              src="/doshi.png"
              alt="Dōshi Sensei looking confused"
              width={200}
              height={200}
              className="mx-auto filter drop-shadow-xl"
            />
          </div>
          {/* Question marks floating around Dōshi */}
          <div className="absolute -top-4 -left-4 text-2xl text-primary animate-spin" style={{ animationDuration: '3s' }}>❓</div>
          <div className="absolute -top-4 -right-4 text-2xl text-accent animate-spin" style={{ animationDuration: '3s', animationDelay: '1s' }}>❓</div>
          <div className="absolute top-1/2 -left-8 text-xl text-secondary animate-spin" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>❓</div>
          <div className="absolute top-1/2 -right-8 text-xl text-muted-foreground animate-spin" style={{ animationDuration: '3s', animationDelay: '1.5s' }}>❓</div>
        </div>

        {/* 404 text with gradient */}
        <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          404
        </h1>

        {/* Japanese title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            あれ？道に迷っちゃった！
          </h2>
          <p className="text-xl text-muted-foreground">
            (Are? Michi ni mayochatta!)
          </p>
        </div>

        {/* Dōshi Sensei name with proper macron */}
        <div className="mb-8">
          <p className="text-lg text-foreground/80">
            <span className="font-bold text-primary">Dōshi Sensei</span> seems to have lost the way...
          </p>
        </div>

        {/* Error message */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-lg">
          <h3 className="text-xl font-semibold text-card-foreground mb-2">
            Page Not Found
          </h3>
          <p className="text-muted-foreground">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
        </div>

        {/* Fun fact */}
        <div className="mt-12 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Fun fact:</span> In Japanese, &quot;404&quot; can be read as &quot;yon-maru-yon&quot; (四〇四), 
            but it doesn&apos;t have any special meaning like it does in web culture! 🎌
          </p>
        </div>
      </div>
    </div>
  );
}