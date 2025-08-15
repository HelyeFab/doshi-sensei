'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { NewsArticle } from '@/types/news';
import { getArticleById } from '@/utils/watanocArticles';
import ArticleReader from '@/components/reading/ArticleReader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { structuredData } from '@/lib/structured-data';

export default function ArticlePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { checkAndTrack } = useAccess();
    const { isPremium, userType } = useSubscription2();
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [canRead, setCanRead] = useState(true);
    const params = useParams();
    const articleId = typeof params?.id === 'string'
        ? params.id
        : Array.isArray(params?.id)
            ? params.id[0]
            : undefined;

    useEffect(() => {
        loadArticle();
    }, [articleId, authLoading]);

    const loadArticle = async () => {
        // Wait for auth to be ready
        if (authLoading) {
            return;
        }

        try {
            setLoading(true);

            if (!articleId) {
                router.push('/news');
                return;
            }

            // Check if user can read articles using new system
            const canAccess = await checkAndTrack('article_reading');
            setCanRead(canAccess);

            if (!canAccess) {
                // The access system will show the appropriate modal
                router.push('/news');
                return;
            }

            // Load article from Firebase

            const loadedArticle = await getArticleById(articleId);

            if (!loadedArticle) {
                console.error('[ArticlePage] Article not found:', articleId);
                router.push('/news');
                return;
            }

            setArticle(loadedArticle);
            // Usage tracking is handled automatically by checkAndTrack
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
            <div className="min-h-screen bg-background">
                <SmartPageHeader title="Loading..." />
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading article...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!article || !canRead) {
        return null;
    }

    // Generate Article structured data
    const articleStructuredData = article ? structuredData.article({
        title: article.title,
        description: article.content?.substring(0, 160) + '...' || article.title,
        publishedAt: article.date ? new Date(article.date).toISOString() : new Date().toISOString(),
        modifiedAt: article.date ? new Date(article.date).toISOString() : new Date().toISOString(),
        author: "NHK News Web Easy",
        imageUrl: article.imageUrl
    }) : null;

    return (
        <div className="min-h-screen bg-background">
            {/* Article Schema for SEO */}
            {articleStructuredData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(articleStructuredData),
                    }}
                />
            )}
            
            <SmartPageHeader title={article.title} />
            <ArticleReader
                article={article}
                onBack={handleExit}
            />
        </div>
    );
}
