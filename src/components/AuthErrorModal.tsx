'use client';

import { useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';

interface AuthErrorModalProps {
  isOpen: boolean;
  error: string;
  onClose: () => void;
}

export default function AuthErrorModal({ isOpen, error, onClose }: AuthErrorModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Convert Firebase errors to user-friendly messages
  const getFriendlyMessage = (errorMsg: string) => {
    const lowerError = errorMsg.toLowerCase();

    if (lowerError.includes('invalid-credential') || lowerError.includes('user-not-found') || lowerError.includes('wrong-password')) {
      return strings.auth.errors.invalidCredentials;
    }

    if (lowerError.includes('email-already-in-use')) {
      return strings.auth.errors.emailAlreadyInUse;
    }

    if (lowerError.includes('weak-password')) {
      return strings.auth.errors.weakPassword;
    }

    if (lowerError.includes('invalid-email')) {
      return strings.auth.errors.invalidEmail;
    }

    if (lowerError.includes('too-many-requests')) {
      return strings.auth.errors.tooManyRequests;
    }

    if (lowerError.includes('network') || lowerError.includes('offline')) {
      return strings.auth.errors.networkError;
    }

    // Default friendly message for unknown errors
    return strings.auth.errors.default;
  };

  const friendlyError = getFriendlyMessage(error);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-xl max-w-md w-full mx-4 relative animate-in fade-in duration-200"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label={strings.common.closeButton}
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal content */}
        <div className="p-6 text-center">
          {/* Giraffe Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 p-2 rounded-full bg-primary/10">
              <svg
                className="w-full h-full text-orange-500"
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path fill="#F1854F" d="M392.234,417.182c3.767,18.644-29.049,52.791-63.693,67.281c-43.675,17.024-83.111,17.024-126.784,0c-34.647-14.49-67.461-48.638-63.697-67.281c5.92-38.733,22.726-81.995,42.498-127.896c11.279-23.67,32.669-40.534,49.7-38.531c22.568,2.78,47.211,2.78,69.779,0c17.032-2.003,38.426,14.861,49.701,38.533C369.511,335.186,386.312,378.448,392.234,417.182z" />
                  <path fill="#F9D555" d="M350.287,402.898c2.525,12.494-19.461,35.37-42.67,45.076c-29.262,11.406-55.68,11.406-84.938,0c-23.212-9.708-45.192-32.582-42.673-45.076c3.968-25.945,15.225-54.931,28.472-85.681c7.554-15.859,21.886-27.156,33.294-25.815c15.123,1.862,31.63,1.862,46.749,0c11.413-1.341,25.742,9.954,33.298,25.815C335.067,347.968,346.321,376.953,350.287,402.898z" />
                  <path fill="#F9D555" d="M342.837,24.959C342.837,11.176,330.899,0,316.173,0c-14.723,0-26.662,11.176-26.662,24.959c0,9.884,6.151,18.401,15.057,22.441l-6.648,31.415c-0.846,3.997,1.707,7.922,5.705,8.769c3.997,0.844,7.922-1.709,8.765-5.708l6.801-32.127C332.493,48.346,342.837,37.787,342.837,24.959z" />
                  <path fill="#F9D555" d="M224.698,24.959C224.698,11.176,212.759,0,198.033,0c-14.727,0-26.663,11.176-26.663,24.959c0,12.828,10.343,23.387,23.648,24.79l6.798,32.127c0.845,3.999,4.772,6.552,8.766,5.708c3.997-0.847,6.551-4.771,5.706-8.769L209.642,47.4C218.543,43.36,224.698,34.843,224.698,24.959z" />
                  <path fill="#F1854F" d="M375.508,286.834c-20.22,32.043-47.635,54.753-116.229,54.753c-64.57,0-90.301-15.052-111.682-44.116c-26.827-36.49-12.958-95.353-3.744-145.547c0.225-1.231,36.269-10.66,36.488-11.88c2.779-15.434-26.633-20.877-17.706-32.501c19.639-25.575,51.476-41.357,83.72-44.835c4.487-0.484,34.565,34.648,39.038,34.648c20.73,0,14.469-32.924,31.984-24.061c5.84,2.953,11.477,6.621,16.9,11.146c18.099,15.102,31.621,34.603,39.35,56.541c1.72,4.884-15.898,15.394-14.765,20.495c1.866,8.409,22.7,11.688,24.234,20.641c3.496,20.404,5.715,41.667,4.781,61.318C387.197,257.846,383.321,274.467,375.508,286.834z" />
                  <path fill="#F9D555" d="M389.808,291.724c-11.857,30.957-45.992,50.282-80.934,56.979c-16.073,3.082-33.26,4.73-49.66,4.73c-47.586,0-100.835-10.202-124.096-54.296c-22.018-41.737-3.526-86.881,41.89-103.802c29.03-10.814,63.447-13.339,94.392-13.589c56.645-0.466,117.39,18.061,122.538,79.545C394.87,272.432,393.31,282.585,389.808,291.724z" />
                  <path fill="#074785" d="M191.259,145.94c-14.305,2.951-20.668,16.133-18.239,30.757c1.239,7.484,12.34,6.271,11.091-1.242c-1.358-8.196,0.355-15.03,8.268-17.701c8.69-2.928,14.685,2.959,15.375,11.888c0.594,7.587,11.683,6.309,11.096-1.237C217.656,152.988,205.686,142.97,191.259,145.94z" />
                  <path fill="#074785" d="M335.132,148.743c-14.329-2.83-25.308,6.853-28.736,21.271c-1.767,7.38,8.938,10.568,10.701,3.159c1.925-8.079,6.159-13.722,14.486-13.105c9.145,0.665,12.39,8.417,9.56,16.916c-2.395,7.223,8.32,10.346,10.711,3.161C356.73,165.476,349.582,151.596,335.132,148.743z" />
                </g>
              </svg>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground mb-3">
            {friendlyError.title}
          </h3>

          {/* Main message */}
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {friendlyError.message}
          </p>

          {/* Suggestion */}
          <div className="bg-muted/50 rounded-lg p-3 mb-6">
            <p className="text-sm text-muted-foreground">
              💡 {friendlyError.suggestion}
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            {strings.common.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
}
