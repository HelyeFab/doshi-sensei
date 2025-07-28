'use client';

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useStrings } from '@/contexts/LanguageContext';

export default function PWATestClient() {
  const strings = useStrings();
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [showSplashPreview, setShowSplashPreview] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();
    window.addEventListener('resize', checkStandalone);
    return () => window.removeEventListener('resize', checkStandalone);
  }, []);

  // Simulate splash screen
  const SplashScreenPreview = () => (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'hsl(271, 81%, 56%)' }}
    >
      <div className="text-center">
        <img 
          src="/doshi.png" 
          alt="DōshiSensei" 
          className="w-32 h-32 mx-auto mb-8"
          style={{ 
            filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.2))'
          }}
        />
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
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {showSplashPreview && <SplashScreenPreview />}

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">PWA Test & Preview Page</h1>

        {/* PWA Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">PWA Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Running as PWA:</span>
              <span className={`font-bold ${isStandalone ? 'text-green-600' : 'text-red-600'}`}>
                {isStandalone ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>App Installed:</span>
              <span className={`font-bold ${isInstalled ? 'text-green-600' : 'text-orange-600'}`}>
                {isInstalled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Can Install:</span>
              <span className={`font-bold ${canInstall ? 'text-green-600' : 'text-gray-600'}`}>
                {canInstall ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Splash Screen Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Splash Screen Preview</h2>
          <p className="text-gray-600 mb-4">
            This is what users see when launching the installed PWA
          </p>
          <button
            onClick={() => {
              setShowSplashPreview(true);
              setTimeout(() => setShowSplashPreview(false), 3000);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Preview Splash Screen (3s)
          </button>
        </div>

        {/* Install Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Install Actions</h2>
          
          {canInstall && (
            <button
              onClick={install}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mb-4"
            >
              Install App Now
            </button>
          )}

          <div className="space-y-2">
            <button
              onClick={() => {
                localStorage.removeItem('pwa-prompt-last-shown');
                window.location.reload();
              }}
              className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reset Install Prompt Timer
            </button>

            <button
              onClick={async () => {
                if ('serviceWorker' in navigator) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (const registration of registrations) {
                    await registration.unregister();
                  }
                  alert('Service Worker unregistered. Reload the page.');
                }
              }}
              className="block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Unregister Service Worker
            </button>
          </div>
        </div>

        {/* Manifest Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Manifest</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`{
  "name": "Doshi Sensei - Japanese Learning",
  "short_name": "Doshi Sensei",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "display": "fullscreen",
  "start_url": "/?source=pwa"
}`}
            </pre>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Open Chrome DevTools (F12)</li>
            <li>Go to Application → Manifest</li>
            <li>Click "Add to homescreen" to test installation</li>
            <li>Or use the "Install App Now" button above if available</li>
            <li>Launch the installed app to see the real splash screen</li>
          </ol>
        </div>
      </div>
    </div>
  );
}