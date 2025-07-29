import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET() {
  try {
    // Fetch latest news articles
    const newsRef = collection(db, 'news');
    const q = query(
      newsRef,
      orderBy('date', 'desc'),
      limit(50) // Latest 50 articles
    );
    
    const snapshot = await getDocs(q);
    
    // Build RSS XML
    const baseUrl = 'https://doshisensei.com';
    
    const rssItems = snapshot.docs.map(doc => {
      const data = doc.data();
      const pubDate = data.date?.toDate() || new Date();
      
      return `
    <item>
      <title><![CDATA[${data.title || 'Untitled'}]]></title>
      <link>${baseUrl}/news/${doc.id}</link>
      <guid isPermaLink="true">${baseUrl}/news/${doc.id}</guid>
      <description><![CDATA[${data.content?.substring(0, 300) || data.title || ''}...]]></description>
      <pubDate>${pubDate.toUTCString()}</pubDate>
      <category>Japanese News</category>
      ${data.imageUrl ? `<enclosure url="${data.imageUrl}" type="image/jpeg" />` : ''}
    </item>`;
    }).join('');
    
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dōshi Sensei - Japanese News</title>
    <link>${baseUrl}/news</link>
    <description>Latest Japanese news articles with furigana support for language learners</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss/news" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;
    
    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
    
  } catch (error) {
    console.error('Error generating news RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    );
  }
}