'use client';

import { useState } from 'react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  if (!isOpen) return null;

  const handleStripeClick = () => {
    // TODO: Replace with your actual Stripe payment link
    window.open('https://buy.stripe.com/YOUR_STRIPE_LINK_HERE', '_blank');
    onClose();
  };

  const handlePayPalClick = () => {
    // TODO: Replace with your actual PayPal donation link
    window.open('https://paypal.me/YOUR_PAYPAL_LINK_HERE', '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center">
          <div className="text-4xl mb-3">☕</div>
          <h2 className="text-xl font-semibold mb-1">Support Doshi Sensei</h2>
          <p className="text-primary-foreground/80 text-sm">
            Help keep this app free and growing!
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-center text-muted-foreground text-sm">
            Choose your preferred donation method:
          </p>

          {/* Stripe Button */}
          <button
            onClick={handleStripeClick}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl p-4 flex items-center justify-center space-x-3 transition-colors group"
          >
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">S</span>
            </div>
            <span className="font-medium">Donate via Stripe</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6L16 12l-6 6" />
            </svg>
          </button>

          {/* PayPal Button */}
          <button
            onClick={handlePayPalClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 flex items-center justify-center space-x-3 transition-colors group"
          >
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">P</span>
            </div>
            <span className="font-medium">Donate via PayPal</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6L16 12l-6 6" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 rounded-xl p-3 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-center text-muted-foreground">
            Your support helps maintain and improve this free Japanese learning tool. ありがとうございます！
          </p>
        </div>
      </div>
    </div>
  );
}
