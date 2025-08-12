'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { toPng } from 'html-to-image';
import { AdminLayout } from '@/components/admin/AdminLayout';

// Popular Google Fonts for marketing
const googleFonts = [
  { name: 'System Default', value: 'system-ui' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Raleway', value: 'Raleway' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Merriweather', value: 'Merriweather' },
  { name: 'Rubik', value: 'Rubik' },
  { name: 'Work Sans', value: 'Work Sans' },
  { name: 'Quicksand', value: 'Quicksand' },
  { name: 'Bebas Neue', value: 'Bebas Neue' },
  { name: 'Dancing Script', value: 'Dancing Script' },
  { name: 'Pacifico', value: 'Pacifico' },
  { name: 'Caveat', value: 'Caveat' },
];

export default function MockupGeneratorPage() {
  // State for customizable parameters
  const [color1, setColor1] = useState('#3B82F6'); // blue-500
  const [color2, setColor2] = useState('#A855F7'); // purple-500
  const [angle, setAngle] = useState(0);
  const [motto, setMotto] = useState('Learn Japanese Your Way');
  const [mockupImage, setMockupImage] = useState<string>('/iphone-mockup.png');
  const [isExporting, setIsExporting] = useState(false);
  
  // Font styling states
  const [selectedFont, setSelectedFont] = useState('system-ui');
  const [fontSize, setFontSize] = useState(20); // Base size, will be scaled for different exports
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textShadow, setTextShadow] = useState(true);
  
  // Refs for export targets
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Load Google Fonts dynamically with crossorigin
  useEffect(() => {
    // Skip loading for system fonts
    if (selectedFont === 'system-ui') return;
    
    const fontLink = document.createElement('link');
    fontLink.href = `https://fonts.googleapis.com/css2?family=${selectedFont.replace(' ', '+')}:wght@400;700&display=swap`;
    fontLink.rel = 'stylesheet';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);
    
    // Preload the font
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'style';
    preloadLink.href = fontLink.href;
    preloadLink.crossOrigin = 'anonymous';
    document.head.appendChild(preloadLink);
    
    return () => {
      if (document.head.contains(fontLink)) {
        document.head.removeChild(fontLink);
      }
      if (document.head.contains(preloadLink)) {
        document.head.removeChild(preloadLink);
      }
    };
  }, [selectedFont]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMockupImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Export functions
  const exportDesktop = async () => {
    if (!desktopRef.current) return;
    setIsExporting(true);
    try {
      // Wait a bit for fonts to load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(desktopRef.current, {
        width: 1920,
        height: 1080,
        pixelRatio: 2, // For high resolution
        cacheBust: true,
        fetchRequestInit: {
          mode: 'cors',
          credentials: 'omit',
        },
        includeQueryParams: true,
      });
      const link = document.createElement('a');
      link.download = `doshi-mockup-desktop-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting desktop view:', error);
      alert('Error exporting image. Please try using a web-safe font or disabling custom fonts.');
    }
    setIsExporting(false);
  };

  const exportMobile = async () => {
    if (!mobileRef.current) return;
    setIsExporting(true);
    try {
      // Wait a bit for fonts to load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(mobileRef.current, {
        width: 390,
        height: 844,
        pixelRatio: 3, // For high resolution mobile
        cacheBust: true,
        fetchRequestInit: {
          mode: 'cors',
          credentials: 'omit',
        },
        includeQueryParams: true,
      });
      const link = document.createElement('a');
      link.download = `doshi-mockup-mobile-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting mobile view:', error);
      alert('Error exporting image. Please try using a web-safe font or disabling custom fonts.');
    }
    setIsExporting(false);
  };

  // Export both desktop and mobile
  const exportBoth = async () => {
    setIsExporting(true);
    await exportDesktop();
    // Small delay between exports
    await new Promise(resolve => setTimeout(resolve, 500));
    await exportMobile();
    setIsExporting(false);
  };

  // Calculate gradient based on angle
  const gradientStyle = `linear-gradient(${angle}deg, ${color1} 50%, ${color2} 50%)`;
  
  // Calculate text styles
  const getTextStyle = (scale: number = 1) => ({
    fontFamily: `'${selectedFont}', sans-serif`,
    fontSize: `${fontSize * scale}px`,
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
    color: textColor,
    textShadow: textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
  });

  return (
    <AdminLayout title="Mockup Generator">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900">Controls</h2>
          
          {/* Color 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Top Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Color 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bottom Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="#A855F7"
              />
            </div>
          </div>

          {/* Angle Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gradient Angle: {angle}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-180°</span>
              <span>0°</span>
              <span>180°</span>
            </div>
          </div>

          {/* Motto Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motto Text
            </label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter motto text"
            />
          </div>

          {/* Font Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {googleFonts.map(font => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="36"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-20"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* Text Style Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Styling
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsBold(!isBold)}
                className={`px-3 py-2 rounded-md border ${
                  isBold ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                <strong>Bold</strong>
              </button>
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`px-3 py-2 rounded-md border ${
                  isItalic ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                <em>Italic</em>
              </button>
              <button
                onClick={() => setTextShadow(!textShadow)}
                className={`px-3 py-2 rounded-md border ${
                  textShadow ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Shadow
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mockup Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Export Buttons */}
          <div className="space-y-3">
            <button
              onClick={exportBoth}
              disabled={isExporting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {isExporting ? 'Exporting...' : '📦 Export Both Desktop & Mobile'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportDesktop}
                disabled={isExporting}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : '🖥️ Desktop'}
              </button>
              <button
                onClick={exportMobile}
                disabled={isExporting}
                className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : '📱 Mobile'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Live Preview</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
              className="relative aspect-video"
              style={{ background: gradientStyle }}
            >
              {/* Logo and Title */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <Image 
                  src="/doshi.png" 
                  alt="Doshi Logo" 
                  width={32} 
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-lg font-bold text-white">Dōshi Sensei</span>
              </div>
              
              {/* Centered Mockup */}
              {mockupImage && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img 
                    src={mockupImage}
                    alt="Mockup" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              
              {/* Motto */}
              <div className="absolute bottom-4 right-4 z-10">
                <p style={getTextStyle(0.7)}>{motto}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Export Targets */}
      <div className="fixed -left-[9999px]">
        {/* Desktop Export Target */}
        <div 
          ref={desktopRef}
          className="relative"
          style={{ 
            width: '1920px', 
            height: '1080px',
            background: gradientStyle 
          }}
        >
          {/* Logo and Title */}
          <div className="absolute top-16 left-16 flex items-center gap-6 z-10">
            <Image 
              src="/doshi.png" 
              alt="Doshi Logo" 
              width={80} 
              height={80}
              className="rounded-lg"
            />
            <span className="text-5xl font-bold text-white">Dōshi Sensei</span>
          </div>
          
          {/* Centered Mockup */}
          {mockupImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={mockupImage}
                alt="Mockup" 
                style={{ maxHeight: '80%', objectFit: 'contain' }}
              />
            </div>
          )}
          
          {/* Motto */}
          <div className="absolute bottom-16 right-16 z-10">
            <p style={getTextStyle(1.5)}>{motto}</p>
          </div>
        </div>

        {/* Mobile Export Target */}
        <div 
          ref={mobileRef}
          className="relative"
          style={{ 
            width: '390px', 
            height: '844px',
            background: gradientStyle 
          }}
        >
          {/* Logo and Title */}
          <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
            <Image 
              src="/doshi.png" 
              alt="Doshi Logo" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-white">Dōshi Sensei</span>
          </div>
          
          {/* Centered Mockup */}
          {mockupImage && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <img 
                src={mockupImage}
                alt="Mockup" 
                style={{ maxHeight: '70%', maxWidth: '90%', objectFit: 'contain' }}
              />
            </div>
          )}
          
          {/* Motto */}
          <div className="absolute bottom-8 right-8 z-10">
            <p style={getTextStyle(0.8)}>{motto}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}