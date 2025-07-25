'use client';

export default function RootLoading() {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundColor: 'hsl(271, 81%, 56%)' }}
    >
      <div className="text-center">
        <div className="relative inline-block">
          {/* Animated background circle */}
          <div className="absolute inset-0 bg-white rounded-full blur-2xl opacity-20 animate-pulse" />
          
          {/* Doshi character */}
          <img 
            src="/doshi.png" 
            alt="DōshiSensei" 
            className="relative w-32 h-32 mx-auto mb-8"
            style={{ 
              animation: 'float 3s ease-in-out infinite',
              filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))'
            }}
          />
        </div>
        
        <h1 
          className="text-5xl font-extrabold mb-3 font-manrope"
          style={{ 
            color: 'hsl(25, 95%, 53%)',
            letterSpacing: '-0.02em'
          }}
        >
          DōshiSensei
        </h1>
        <p className="text-lg text-white/90 mb-8 font-medium">動詞先生</p>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        <p className="text-sm text-white/70 mt-4">Master Japanese Conjugations</p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}