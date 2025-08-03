'use client';

import { useEffect, useRef, useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  referralCode: string;
  baseUrl?: string;
}

export function QRCodeDisplay({ referralCode, baseUrl }: QRCodeDisplayProps) {
  const strings = useStrings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const referralUrl = baseUrl 
    ? `${baseUrl}?ref=${referralCode}`
    : `https://doshisensei.com?ref=${referralCode}`;

  useEffect(() => {
    if (canvasRef.current) {
      // Generate QR code
      QRCode.toCanvas(canvasRef.current, referralUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) {
          console.error('QR Code generation error:', error);
        }
      });
    }
  }, [referralUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    setIsDownloading(true);
    
    // Convert canvas to blob and download
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `doshi-sensei-referral-${referralCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setIsDownloading(false);
    }, 'image/png');
  };

  const handleShare = async () => {
    if (!canvasRef.current || !navigator.share) return;
    
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob(resolve, 'image/png');
      });
      
      if (blob) {
        const file = new File([blob], `doshi-sensei-qr-${referralCode}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: strings.share?.qr?.shareTitle || 'Doshi Sensei Referral QR Code',
          text: strings.share?.qr?.shareText || 'Scan this QR code to join Doshi Sensei!',
          files: [file]
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-medium text-gray-900 mb-2">
          {strings.share?.qr?.title || 'Share with QR Code'}
        </h4>
        <p className="text-sm text-gray-600">
          {strings.share?.qr?.description || 'Friends can scan this code to sign up with your referral'}
        </p>
      </div>
      
      {/* QR Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center"
      >
        <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-gray-200">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>
      </motion.div>
      
      {/* Actions */}
      <div className="flex gap-2 justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isDownloading 
            ? (strings.share?.qr?.downloading || 'Downloading...') 
            : (strings.share?.qr?.download || 'Download QR')}
        </motion.button>
        
        {navigator.share && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {strings.share?.qr?.share || 'Share QR'}
          </motion.button>
        )}
      </div>
      
      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-2">
          {strings.share?.qr?.howTo || 'How to use:'}
        </h5>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>{strings.share?.qr?.step1 || 'Show this QR code to your friend'}</li>
          <li>{strings.share?.qr?.step2 || 'They scan it with their phone camera'}</li>
          <li>{strings.share?.qr?.step3 || 'They can start learning Japanese together with you!'}</li>
        </ol>
      </div>
    </div>
  );
}