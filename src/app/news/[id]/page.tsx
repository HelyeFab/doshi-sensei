'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { NewsArticle } from '@/types/news';
import { getArticleById } from '@/utils/watanocArticles';
import ArticleReader from '@/components/reading/ArticleReader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useEntitlements } from '@/hooks/useEntitlements';

export default function ArticlePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { userType, showLoginPrompt, showUpgradePrompt, incrementArticleCount } = useSubscription();
    const { canReadArticle, promptForAccess } = useEntitlements();
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [canRead, setCanRead] = useState(true);
    const params = useParams();
    const articleId = typeof params?.id === 'string'
        ? params.id
        : Array.isArray(params?.id)
            ? params.id[0]
            : undefined;

    const isPremium = userType === 'monthly' || userType === 'yearly';

    useEffect(() => {
        loadArticle();
    }, [articleId]);

    const loadArticle = async () => {
        try {
            setLoading(true);

            // Check if user can read articles today using entitlements
            const articleCheck = canReadArticle();
            setCanRead(articleCheck.allowed);

            if (!articleCheck.allowed) {
                promptForAccess(
                    'articles',
                    !user
                        ? `You've reached your daily article limit (${articleCheck.used}/${articleCheck.limit})! Sign up to read more articles and save your progress.`
                        : `You've read your daily article limit (${articleCheck.used}/${articleCheck.limit})! Upgrade to Premium for unlimited articles.`
                );
                router.push('/news');
                return;
            }

            if (!articleId) {
                router.push('/news');
                return;
            }

            // Load article from Firebase
            const loadedArticle = await getArticleById(articleId);

            if (!loadedArticle) {
                router.push('/news');
                return;
            }

            setArticle(loadedArticle);

            // Track article read after successfully loading
            try {
                await incrementArticleCount();
            } catch (error) {
                console.error('Error tracking article read:', error);
                // Don't fail the whole article load if tracking fails
            }
        } catch (error) {
            console.error('Error loading article:', error);
            router.push('/news');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        router.push('/news');
    };

    const handleExit = () => {
        router.push('/news');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading article...</p>
                </div>
            </div>
        );
    }

    if (!article || !canRead) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <ArticleReader
                article={article}
                onBack={handleExit}
            />
        </div>
    );
}
