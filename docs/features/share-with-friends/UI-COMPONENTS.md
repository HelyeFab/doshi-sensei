# Share with Friends - UI Components Guide

## Overview

This document details all UI components for the Share with Friends feature, including designs, interactions, and implementation guidelines.

## Table of Contents

1. [Component Library](#component-library)
2. [Share Modal Design](#share-modal-design)
3. [Share Button Variants](#share-button-variants)
4. [Social Media Cards](#social-media-cards)
5. [QR Code Display](#qr-code-display)
6. [Analytics Dashboard](#analytics-dashboard)
7. [Mobile Optimization](#mobile-optimization)
8. [Accessibility](#accessibility)

## Component Library

### Core Components Structure

```
/src/components/sharing/
├── ShareButton/
│   ├── ShareButton.tsx
│   ├── ShareButton.styles.ts
│   └── ShareButton.test.tsx
├── ShareModal/
│   ├── ShareModal.tsx
│   ├── ShareMethodGrid.tsx
│   ├── ReferralLinkInput.tsx
│   └── ShareModal.styles.ts
├── QRCode/
│   ├── QRCodeDisplay.tsx
│   └── QRCodeDownload.tsx
├── Analytics/
│   ├── ShareStats.tsx
│   ├── ConversionFunnel.tsx
│   └── LeaderboardWidget.tsx
└── SocialCards/
    ├── TwitterCard.tsx
    ├── FacebookCard.tsx
    └── SharePreview.tsx
```

## Share Modal Design

### Main Modal Component

```typescript
// ShareModal.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'social' | 'link' | 'qr'>('social');
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Share Doshi Sensei
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex mt-4 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['social', 'link', 'qr'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all
                      ${activeTab === tab
                        ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                      }
                    `}
                  >
                    {tab === 'social' && 'Social Media'}
                    {tab === 'link' && 'Copy Link'}
                    {tab === 'qr' && 'QR Code'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <AnimatePresence mode="wait">
                {activeTab === 'social' && (
                  <motion.div
                    key="social"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ShareMethodGrid />
                  </motion.div>
                )}
                
                {activeTab === 'link' && (
                  <motion.div
                    key="link"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ReferralLinkSection />
                  </motion.div>
                )}
                
                {activeTab === 'qr' && (
                  <motion.div
                    key="qr"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <QRCodeSection />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Footer with incentive info */}
            <div className="px-6 py-4 bg-primary/5 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">
                    Earn 7 days premium for each friend who joins!
                  </span>
                </div>
                <button className="text-sm text-primary hover:underline">
                  Learn more
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Share Method Grid

```typescript
// ShareMethodGrid.tsx
const shareMethods = [
  { id: 'twitter', name: 'Twitter', icon: TwitterIcon, color: '#1DA1F2' },
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366' },
  { id: 'telegram', name: 'Telegram', icon: TelegramIcon, color: '#0088CC' },
  { id: 'email', name: 'Email', icon: MailIcon, color: '#EA4335' },
  { id: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, color: '#0A66C2' },
];

export function ShareMethodGrid() {
  const { share, isSharing } = useShare();
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {shareMethods.map((method) => (
        <motion.button
          key={method.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => share(method.id as ShareMethod)}
          disabled={isSharing}
          className={`
            relative p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700
            hover:border-${method.id} hover:bg-${method.id}/5
            transition-all duration-200 group
          `}
        >
          <div className="flex flex-col items-center space-y-2">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${method.color}15` }}
            >
              <method.icon 
                className="w-6 h-6" 
                style={{ color: method.color }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {method.name}
            </span>
          </div>
          
          {isSharing && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-xl flex items-center justify-center">
              <Spinner className="w-5 h-5" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
```

### Referral Link Input

```typescript
// ReferralLinkInput.tsx
export function ReferralLinkSection() {
  const { referralLink, copyToClipboard, copied } = useReferral();
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  
  return (
    <div className="space-y-4">
      {/* Link display and copy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your referral link
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => copyToClipboard(referralLink)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${copied 
                ? 'bg-green-500 text-white' 
                : 'bg-primary text-white hover:bg-primary/90'
              }
            `}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 inline mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 inline mr-1" />
                Copy
              </>
            )}
          </motion.button>
        </div>
      </div>
      
      {/* Custom message */}
      <div>
        <button
          onClick={() => setShowCustomMessage(!showCustomMessage)}
          className="text-sm text-primary hover:underline flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add a personal message
        </button>
        
        <AnimatePresence>
          {showCustomMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3"
            >
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal touch to your invitation..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => copyToClipboard(`${customMessage}\n\n${referralLink}`)}
                  className="text-sm px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Copy with message
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Share templates */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick share templates
        </h3>
        <div className="space-y-2">
          {shareTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => copyToClipboard(template.getMessage({ link: referralLink }))}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {template.preview}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Share Button Variants

### Primary Share Button

```typescript
// ShareButton.tsx
interface ShareButtonProps {
  variant?: 'primary' | 'secondary' | 'floating' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function ShareButton({ 
  variant = 'primary', 
  size = 'md', 
  showText = true,
  className 
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-md',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    floating: 'fixed bottom-4 right-4 bg-primary text-white rounded-full shadow-lg',
    inline: 'text-primary hover:text-primary/80 underline'
  };
  
  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        className={`
          inline-flex items-center font-medium rounded-lg transition-all
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        <Share2 className={`${showText ? 'mr-2' : ''} w-4 h-4`} />
        {showText && 'Share'}
      </motion.button>
      
      <ShareModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
```

### Contextual Share Buttons

```typescript
// AchievementShareButton.tsx
export function AchievementShareButton({ achievement }: { achievement: Achievement }) {
  const { share } = useShare();
  
  const handleShare = () => {
    share('achievement', {
      achievementName: achievement.name,
      achievementIcon: achievement.icon,
      userStats: getUserStats()
    });
  };
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-medium"
      onClick={handleShare}
    >
      <Trophy className="w-5 h-5 inline mr-2" />
      Share Achievement
    </motion.button>
  );
}
```

## Social Media Cards

### Share Preview Component

```typescript
// SharePreview.tsx
export function SharePreview({ platform, content }: SharePreviewProps) {
  const renderPreview = () => {
    switch (platform) {
      case 'twitter':
        return <TwitterCardPreview content={content} />;
      case 'facebook':
        return <FacebookCardPreview content={content} />;
      case 'linkedin':
        return <LinkedInCardPreview content={content} />;
      default:
        return <GenericPreview content={content} />;
    }
  };
  
  return (
    <div className="share-preview">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Preview on {platform}
      </h3>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
}

// Twitter Card Preview
function TwitterCardPreview({ content }: { content: ShareContent }) {
  return (
    <div className="p-4 bg-white">
      <div className="flex space-x-3">
        <img 
          src="/avatar-placeholder.png" 
          className="w-12 h-12 rounded-full"
          alt="User avatar"
        />
        <div className="flex-1">
          <div className="flex items-center space-x-1">
            <span className="font-bold">Your Name</span>
            <span className="text-gray-500">@username</span>
            <span className="text-gray-500">· now</span>
          </div>
          <p className="mt-2 text-gray-900">{content.text}</p>
          <div className="mt-3 border border-gray-200 rounded-2xl overflow-hidden">
            <img 
              src="/share-preview.png" 
              className="w-full h-48 object-cover"
              alt="Doshi Sensei preview"
            />
            <div className="p-4">
              <h4 className="font-bold">{content.title}</h4>
              <p className="text-gray-500 text-sm mt-1">{content.description}</p>
              <p className="text-gray-500 text-sm mt-1">{content.url}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## QR Code Display

### QR Code Component

```typescript
// QRCodeDisplay.tsx
import QRCode from 'qrcode.react';

export function QRCodeSection() {
  const { referralLink } = useReferral();
  const [size, setSize] = useState(200);
  
  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');
    
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = 'doshi-sensei-qr.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-4 bg-white rounded-lg shadow-inner">
        <QRCode
          id="qr-code"
          value={referralLink}
          size={size}
          level="M"
          includeMargin={true}
          renderAs="canvas"
          imageSettings={{
            src: '/icon-192x192.png',
            height: 30,
            width: 30,
            excavate: true
          }}
        />
      </div>
      
      {/* Size selector */}
      <div className="flex items-center space-x-4">
        <label className="text-sm text-gray-600">Size:</label>
        <div className="flex space-x-2">
          {[150, 200, 250].map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`
                px-3 py-1 rounded text-sm
                ${size === s 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {s}px
            </button>
          ))}
        </div>
      </div>
      
      {/* Download button */}
      <button
        onClick={downloadQR}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Download className="w-4 h-4 inline mr-2" />
        Download QR Code
      </button>
      
      {/* Instructions */}
      <div className="text-center text-sm text-gray-600 space-y-1">
        <p>Perfect for sharing in person!</p>
        <p>Friends can scan to join instantly</p>
      </div>
    </div>
  );
}
```

## Analytics Dashboard

### User Stats Component

```typescript
// ShareStats.tsx
export function ShareStats() {
  const { stats, isLoading } = useShareAnalytics();
  
  if (isLoading) {
    return <ShareStatsSkeleton />;
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Friends Joined"
        value={stats.conversions}
        change={stats.conversionsChange}
        color="blue"
      />
      <StatCard
        icon={<Share2 className="w-5 h-5" />}
        label="Total Shares"
        value={stats.totalShares}
        change={stats.sharesChange}
        color="green"
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Conversion Rate"
        value={`${stats.conversionRate}%`}
        change={stats.conversionRateChange}
        color="purple"
      />
      <StatCard
        icon={<Gift className="w-5 h-5" />}
        label="Days Earned"
        value={stats.rewardDays}
        change={stats.rewardDaysChange}
        color="orange"
      />
    </div>
  );
}

// Individual stat card
function StatCard({ icon, label, value, change, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/20',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20'
  };
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change !== 0 && (
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </p>
    </motion.div>
  );
}
```

## Mobile Optimization

### Responsive Share Modal

```typescript
// Mobile-optimized share modal
export function MobileShareModal({ isOpen, onClose }: ShareModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        
        <SheetHeader>
          <SheetTitle>Share Doshi Sensei</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Native share button (mobile only) */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full p-4 bg-primary text-white rounded-xl font-medium"
            >
              <Share className="w-5 h-5 inline mr-2" />
              Share via...
            </button>
          )}
          
          {/* Social media grid - 2 columns on mobile */}
          <div className="grid grid-cols-2 gap-3">
            {shareMethods.map((method) => (
              <MobileShareButton key={method.id} method={method} />
            ))}
          </div>
          
          {/* Collapsible sections for link and QR */}
          <Accordion type="single" collapsible>
            <AccordionItem value="link">
              <AccordionTrigger>Copy Link</AccordionTrigger>
              <AccordionContent>
                <ReferralLinkSection />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="qr">
              <AccordionTrigger>QR Code</AccordionTrigger>
              <AccordionContent>
                <QRCodeSection />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Touch-Optimized Interactions

```typescript
// Touch-friendly share button
function MobileShareButton({ method }: { method: ShareMethod }) {
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <motion.button
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      animate={{ scale: isPressed ? 0.95 : 1 }}
      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl active:bg-gray-100"
    >
      <method.icon className="w-8 h-8 mx-auto mb-2" style={{ color: method.color }} />
      <span className="text-sm font-medium">{method.name}</span>
    </motion.button>
  );
}
```

## Accessibility

### ARIA Labels and Keyboard Navigation

```typescript
// Accessible share modal
export function AccessibleShareModal({ isOpen, onClose }: ShareModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus management
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);
  
  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      aria-describedby="share-modal-description"
      onKeyDown={handleKeyDown}
    >
      <h2 id="share-modal-title">Share Doshi Sensei with Friends</h2>
      <p id="share-modal-description" className="sr-only">
        Choose how you'd like to share Doshi Sensei. You'll earn rewards when friends join.
      </p>
      
      {/* Share methods with proper ARIA */}
      <div role="group" aria-label="Sharing methods">
        {shareMethods.map((method, index) => (
          <button
            key={method.id}
            aria-label={`Share via ${method.name}`}
            tabIndex={isOpen ? 0 : -1}
            className="share-method-button"
          >
            {/* Content */}
          </button>
        ))}
      </div>
      
      <button
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="Close share modal"
        className="close-button"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
```

### Screen Reader Announcements

```typescript
// Announce share success to screen readers
function announceShareResult(success: boolean, method: string) {
  const announcement = success
    ? `Successfully shared via ${method}`
    : `Failed to share via ${method}. Please try again.`;
    
  const liveRegion = document.getElementById('share-announcements') || 
    createLiveRegion();
    
  liveRegion.textContent = announcement;
  
  // Clear after announcement
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 3000);
}

function createLiveRegion() {
  const region = document.createElement('div');
  region.id = 'share-announcements';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.className = 'sr-only';
  document.body.appendChild(region);
  return region;
}
```