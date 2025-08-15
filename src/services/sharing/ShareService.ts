/**
 * Share Service
 * Handles all sharing functionality including social media, referrals, and analytics
 */

import { ShareContent, ShareMethod, ShareResult, ShareEvent, ShareTemplate, ShareTemplateType } from '@/types/sharing';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export class ShareService {
  private static instance: ShareService;
  
  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }
  
  /**
   * Main share method
   */
  async share(content: ShareContent, method: ShareMethod, userId?: string | null): Promise<ShareResult> {
    try {
      let success = false;
      
      // Execute share based on method
      if (method === 'native' && this.isNativeShareAvailable()) {
        success = await this.nativeShare(content);
      } else {
        success = await this.fallbackShare(content, method);
      }
      
      // Track share event only for authenticated users
      if (userId) {
        try {
          await this.trackShare(userId, method, content, success);
        } catch (trackError) {
          // Silently fail tracking - sharing should still work

        }
      }
      
      return {
        success,
        method,
        referralCode: content.referralCode
      };
    } catch (error) {
      console.error('Share failed:', error);
      return {
        success: false,
        method,
        error: error instanceof Error ? error.message : 'Share failed'
      };
    }
  }
  
  /**
   * Check if native share API is available
   */
  private isNativeShareAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }
  
  /**
   * Use native share API
   */
  private async nativeShare(content: ShareContent): Promise<boolean> {
    try {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.url
      });
      return true;
    } catch (error) {
      // User cancelled or error occurred
      if (error instanceof Error && error.name === 'AbortError') {
        return false; // User cancelled, not an error
      }
      throw error;
    }
  }
  
  /**
   * Fallback share methods
   */
  private async fallbackShare(content: ShareContent, method: ShareMethod): Promise<boolean> {
    switch (method) {
      case 'clipboard':
        return this.copyToClipboard(content);
      case 'twitter':
        return this.shareToTwitter(content);
      case 'facebook':
        return this.shareToFacebook(content);
      case 'whatsapp':
        return this.shareToWhatsApp(content);
      case 'telegram':
        return this.shareToTelegram(content);
      case 'linkedin':
        return this.shareToLinkedIn(content);
      case 'email':
        return this.shareViaEmail(content);
      case 'discord':
        return this.shareToDiscord(content);
      case 'instagram':
        return this.shareToInstagram(content);
      case 'snapchat':
        return this.shareToSnapchat(content);
      case 'wechat':
        return this.shareToWeChat(content);
      case 'line':
        return this.shareToLine(content);
      case 'sms':
        return this.shareViaSMS(content);
      case 'copy':
        return this.copyToClipboard(content);
      default:
        return false;
    }
  }
  
  /**
   * Copy to clipboard
   */
  private async copyToClipboard(content: ShareContent): Promise<boolean> {
    try {
      const text = `${content.text}\n\n${content.url}`;
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }
  
  /**
   * Share to Twitter
   */
  private shareToTwitter(content: ShareContent): boolean {
    const text = encodeURIComponent(content.text);
    const url = encodeURIComponent(content.url);
    const hashtags = content.hashtags?.join(',') || '';
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}${hashtags ? `&hashtags=${hashtags}` : ''}`;
    
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    return true;
  }
  
  /**
   * Share to Facebook
   */
  private shareToFacebook(content: ShareContent): boolean {
    const url = encodeURIComponent(content.url);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    return true;
  }
  
  /**
   * Share to WhatsApp
   */
  private shareToWhatsApp(content: ShareContent): boolean {
    const text = encodeURIComponent(`${content.text}\n\n${content.url}`);
    const whatsappUrl = `https://wa.me/?text=${text}`;
    
    window.open(whatsappUrl, '_blank');
    return true;
  }
  
  /**
   * Share to Telegram
   */
  private shareToTelegram(content: ShareContent): boolean {
    const url = encodeURIComponent(content.url);
    const text = encodeURIComponent(content.text);
    const telegramUrl = `https://t.me/share/url?url=${url}&text=${text}`;
    
    window.open(telegramUrl, '_blank');
    return true;
  }
  
  /**
   * Share to LinkedIn
   */
  private shareToLinkedIn(content: ShareContent): boolean {
    const url = encodeURIComponent(content.url);
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
    return true;
  }
  
  /**
   * Share via Email
   */
  private shareViaEmail(content: ShareContent): boolean {
    const subject = encodeURIComponent(content.title);
    const body = encodeURIComponent(`${content.text}\n\n${content.url}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoUrl;
    return true;
  }
  
  /**
   * Share to Discord
   */
  private shareToDiscord(content: ShareContent): boolean {
    // Discord doesn't have a direct share URL, so we copy to clipboard
    // and show a message to paste in Discord
    const text = `${content.text}\n\n${content.url}`;
    navigator.clipboard.writeText(text);
    alert('Link copied! Paste it in your Discord channel.');
    return true;
  }
  
  /**
   * Share to Instagram
   */
  private shareToInstagram(content: ShareContent): boolean {
    // Instagram doesn't support direct URL sharing from web
    // Copy to clipboard for Stories/DMs
    navigator.clipboard.writeText(content.url);
    alert('Link copied! You can paste it in Instagram Stories or Direct Messages.');
    // Open Instagram
    window.open('https://www.instagram.com/', '_blank');
    return true;
  }
  
  /**
   * Share to Snapchat
   */
  private shareToSnapchat(content: ShareContent): boolean {
    const url = encodeURIComponent(content.url);
    const text = encodeURIComponent(content.text);
    // Snapchat Creative Kit URL scheme
    const snapchatUrl = `https://www.snapchat.com/scan?attachmentUrl=${url}`;
    window.open(snapchatUrl, '_blank');
    return true;
  }
  
  /**
   * Share to WeChat
   */
  private shareToWeChat(content: ShareContent): boolean {
    // WeChat requires their SDK for proper sharing
    // For now, copy to clipboard
    const text = `${content.text}\n\n${content.url}`;
    navigator.clipboard.writeText(text);
    alert('Link copied! You can paste it in WeChat.');
    return true;
  }
  
  /**
   * Share to LINE
   */
  private shareToLine(content: ShareContent): boolean {
    const text = encodeURIComponent(`${content.text}\n${content.url}`);
    const lineUrl = `https://line.me/R/msg/text/?${text}`;
    window.open(lineUrl, '_blank');
    return true;
  }
  
  /**
   * Share via SMS
   */
  private shareViaSMS(content: ShareContent): boolean {
    const text = encodeURIComponent(`${content.text}\n\n${content.url}`);
    const smsUrl = `sms:?body=${text}`;
    window.location.href = smsUrl;
    return true;
  }
  
  /**
   * Track share event
   */
  private async trackShare(
    userId: string, 
    method: ShareMethod, 
    content: ShareContent,
    success: boolean
  ): Promise<void> {
    try {
      const shareEvent: Omit<ShareEvent, 'id'> = {
        userId,
        timestamp: new Date(),
        method,
        content: {
          type: 'general', // Default, should be passed in content
          context: {
            title: content.title,
            hasImage: !!content.image,
            hasHashtags: !!(content.hashtags && content.hashtags.length > 0)
          }
        },
        ...(content.referralCode ? { referralCode: content.referralCode } : {}),
        result: {
          success,
          ...(success ? {} : { error: 'Share failed or cancelled' })
        },
        deviceInfo: {
          platform: typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }
      };
      
      await addDoc(collection(db, 'shareEvents'), {
        ...shareEvent,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to track share event:', error);
      // Don't throw - tracking failure shouldn't break sharing
    }
  }
  
  /**
   * Get share templates
   */
  async getShareTemplates(type?: ShareTemplateType): Promise<ShareTemplate[]> {
    // These could be stored in Firestore for dynamic updates
    const templates: ShareTemplate[] = [
      {
        id: 'general',
        type: 'general',
        title: 'Learn Japanese with Doshi Sensei',
        message: 'Check out Doshi Sensei - the best app for learning Japanese verb and adjective conjugations!',
        variables: [],
        platforms: {
          twitter: 'Learning Japanese with @DoshiSensei - the best app for mastering conjugations! 🇯🇵',
          whatsapp: 'Hey! I\'m learning Japanese with Doshi Sensei. It\'s amazing for practicing conjugations. You should try it!'
        }
      },
      {
        id: 'achievement',
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'I just unlocked "{achievementName}" on Doshi Sensei! 🏆',
        variables: ['achievementName', 'achievementIcon'],
        platforms: {
          twitter: 'Just unlocked "{achievementName}" on @DoshiSensei! 🏆 #JapaneseLearning',
          facebook: 'Achievement unlocked: {achievementName} on Doshi Sensei! Join me in learning Japanese!'
        }
      },
      {
        id: 'progress',
        type: 'progress',
        title: 'My Japanese Progress',
        message: 'I\'ve learned {kanjiCount} kanji and practiced {totalPractices} times on Doshi Sensei!',
        variables: ['kanjiCount', 'totalPractices'],
        platforms: {
          twitter: 'Progress update: {kanjiCount} kanji learned, {totalPractices} practices completed! 📚 @DoshiSensei',
          linkedin: 'Excited to share my Japanese learning progress: {kanjiCount} kanji mastered through Doshi Sensei!'
        }
      },
      {
        id: 'streak',
        type: 'streak',
        title: 'Learning Streak!',
        message: '{days} day learning streak on Doshi Sensei! 🔥',
        variables: ['days'],
        platforms: {
          twitter: '{days} day streak on @DoshiSensei! 🔥 Consistency is key in language learning! #Japanese',
          whatsapp: 'I\'m on a {days} day learning streak with Doshi Sensei! Join me! 🔥'
        }
      }
    ];
    
    if (type) {
      return templates.filter(t => t.type === type);
    }
    
    return templates;
  }
  
  /**
   * Format share message using template
   */
  formatShareMessage(
    template: ShareTemplate, 
    data: Record<string, any>, 
    platform?: ShareMethod
  ): string {
    let message = template.message;
    
    // Use platform-specific message if available
    if (platform && template.platforms[platform]) {
      message = typeof template.platforms[platform] === 'string' 
        ? template.platforms[platform] as string
        : template.message;
    }
    
    // Replace variables
    template.variables.forEach(variable => {
      const value = data[variable] || '';
      message = message.replace(new RegExp(`{${variable}}`, 'g'), value);
    });
    
    return message;
  }
}