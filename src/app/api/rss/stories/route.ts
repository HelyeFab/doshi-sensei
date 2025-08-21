import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export async function GET() {
  try {
    // Fetch latest published stories
    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef,
      where('published', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(50) // Latest 50 stories
    );
    
    const snapshot = await getDocs(q);
    
    // Build RSS XML
    const baseUrl = 'https://doshisensei.com';
    
    const rssItems = snapshot.docs.map(doc => {
      const data = doc.data();
      const pubDate = data.publishedAt?.toDate() || new Date();
      const slug = data.slug || doc.id;
      
      return `
    <item>
      <title><![CDATA[${data.title || 'Untitled Story'}]]></title>
      <link>${baseUrl}/stories/${slug}</link>
      <guid isPermaLink="true">${baseUrl}/stories/${slug}</guid>
      <description><![CDATA[${data.description || data.title || 'An interactive Japanese story'}]]></description>
      <pubDate>${pubDate.toUTCString()}</pubDate>
      <category>Japanese Stories</category>
      ${data.imageUrl ? `<enclosure url="${data.imageUrl}" type="image/jpeg" />` : ''}
      ${data.difficulty ? `<category>Difficulty: ${data.difficulty}</category>` : ''}
      ${data.genre ? `<category>Genre: ${data.genre}</category>` : ''}
    </item>`;
    }).join('');
    
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dōshi Sensei - AI-Generated Japanese Stories</title>
    <link>${baseUrl}/stories</link>
    <description>Interactive AI-generated Japanese stories for language learners with furigana and grammar explanations</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss/stories" rel="self" type="application/rss+xml" />
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
    console.error('Error generating stories RSS feed:', error);
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    );
  }
}