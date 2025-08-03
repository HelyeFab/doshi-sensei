'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShareService } from '@/services/sharing/ShareService';
import { ReferralService } from '@/services/sharing/ReferralService';
import { ShareContent, ShareMethod, UserShareStats } from '@/types/sharing';
import { useAccess } from '@/hooks/useAccess';

export function useShare() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareStats, setShareStats] = useState<UserShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const shareService = ShareService.getInstance();
  const referralService = ReferralService.getInstance();
  const { canAccess } = useAccess();

  // Load user's referral code and stats
  const loadShareData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get or create referral code
      const response = await fetch('/api/share/create-referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error('Failed to get referral code');
      }
      
      const data = await response.json();
      setReferralCode(data.referralCode);
      
      // Get share stats
      const statsResponse = await fetch(`/api/share/stats/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setShareStats({
          userId: user.uid,
          totalShares: stats.totalShares || 0,
          successfulShares: stats.successfulShares || 0,
          totalConversions: stats.conversions || 0,
          conversionRate: stats.conversionRate || 0,
          rewardsEarned: {
            premiumDays: 0,
            points: 0,
            achievements: []
          },
          sharesByMethod: stats.sharesByMethod || {},
          sharesByContent: stats.sharesByContent || {},
          lastUpdated: stats.lastShareDate ? new Date(stats.lastShareDate) : null
        });
      }
    } catch (err) {
      console.error('Failed to load share data:', err);
      setError('Failed to load share information');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Share content
  const shareContent = useCallback(async (
    content: ShareContent,
    method: ShareMethod
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    
    try {
      // No limits on sharing - everyone can share!
      
      // Add referral code to content if available
      if (referralCode && !content.referralCode) {
        content.referralCode = referralCode;
      }
      
      // Execute share
      const result = await shareService.share(content, method, user?.uid || null);
      
      if (result.success) {
        // Track share event
        await fetch('/api/share/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user && { 'Authorization': `Bearer ${await user.getIdToken()}` })
          },
          body: JSON.stringify({
            method,
            content,
            referralCode: content.referralCode
          })
        });
        
        // Stats will be reloaded on next render
      }
      
      return result;
    } catch (err) {
      console.error('Share error:', err);
      const errorMessage = 'Failed to share content';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [referralCode, user, canAccess, shareService]);

  // Generate share URL with referral code
  const generateShareUrl = useCallback((baseUrl?: string) => {
    if (!referralCode) return baseUrl || 'https://doshisensei.com';
    
    const url = new URL(baseUrl || 'https://doshisensei.com');
    url.searchParams.set('ref', referralCode);
    return url.toString();
  }, [referralCode]);

  // Get share templates
  const getShareTemplates = useCallback((contentType?: string) => {
    return shareService.getShareTemplates({
      appName: 'Doshi Sensei',
      userAchievement: contentType === 'achievement' ? 'Earned a new badge!' : undefined,
      contentTitle: contentType === 'article' ? 'Check out this article' : undefined
    });
  }, [shareService]);

  useEffect(() => {
    if (user) {
      loadShareData();
    }
  }, [user, loadShareData]);

  return {
    shareContent,
    referralCode,
    shareStats,
    isLoading,
    error,
    loadShareData,
    generateShareUrl,
    getShareTemplates
  };
}