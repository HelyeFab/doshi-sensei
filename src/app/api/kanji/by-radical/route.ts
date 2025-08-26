import { NextRequest, NextResponse } from 'next/server';
import { SEMANTIC_RADICALS, identifySubTheme, type RadicalKanji } from '@/lib/kanji/radicals';
import { getKanjiByRadical } from '@/services/kanji-data-service';

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Fetch kanji from local JMdict data
async function fetchKanjiByRadical(radical: string): Promise<RadicalKanji[]> {
  try {
    // Try to load from our existing JMdict data
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/kanji/search?radical=${encodeURIComponent(radical)}`);
    
    if (!response.ok) {
      // Fallback to kanjiapi.dev if our endpoint fails
      return await fetchFromKanjiAPI(radical);
    }
    
    const data = await response.json();
    return data.kanji || [];
  } catch (error) {
    console.error('Error fetching from local data:', error);
    return await fetchFromKanjiAPI(radical);
  }
}

// Fallback to kanjiapi.dev
async function fetchFromKanjiAPI(radical: string): Promise<RadicalKanji[]> {
  const cacheKey = `kanjiapi_${radical}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // First, get the radical details
    const radicalResponse = await fetch(`https://kanjiapi.dev/v1/kanji?radical=${encodeURIComponent(radical)}`);
    
    if (!radicalResponse.ok) {
      return [];
    }
    
    const kanjiList = await radicalResponse.json();
    
    // Fetch details for each kanji (limited to prevent rate limiting)
    const kanjiDetails: RadicalKanji[] = [];
    const limitedList = kanjiList.slice(0, 50); // Limit to 50 kanji to avoid rate limiting
    
    for (const kanjiChar of limitedList) {
      try {
        const detailResponse = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanjiChar)}`);
        
        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          
          kanjiDetails.push({
            kanji: kanjiChar,
            meanings: detail.meanings || [],
            readings: {
              kun: detail.kun_readings || [],
              on: detail.on_readings || []
            },
            jlpt: detail.jlpt,
            grade: detail.grade,
            frequency: detail.freq
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error fetching details for ${kanjiChar}:`, error);
      }
    }
    
    cache.set(cacheKey, { data: kanjiDetails, timestamp: Date.now() });
    return kanjiDetails;
  } catch (error) {
    console.error('Error fetching from kanjiapi.dev:', error);
    return [];
  }
}

// Get kanji by radical with sub-theme clustering
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const radicalId = searchParams.get('radical');
  const includeSubThemes = searchParams.get('subThemes') === 'true';
  
  if (!radicalId) {
    return NextResponse.json({ error: 'Radical ID is required' }, { status: 400 });
  }
  
  const radicalInfo = SEMANTIC_RADICALS[radicalId];
  
  if (!radicalInfo) {
    return NextResponse.json({ error: 'Invalid radical ID' }, { status: 404 });
  }
  
  try {
    // Use our data service to get kanji for this radical
    const kanjiData = await getKanjiByRadical(radicalInfo.radical);
    
    // Convert to RadicalKanji format
    const kanjiList: RadicalKanji[] = kanjiData.map(k => ({
      kanji: k.kanji,
      meanings: k.meanings || [k.meaning],
      readings: {
        kun: k.kunyomi,
        on: k.onyomi
      },
      jlpt: k.jlpt,
      grade: k.grade,
      frequency: k.frequency
    }));
    
    // Add sub-theme clustering if requested
    if (includeSubThemes && radicalInfo.subThemes) {
      kanjiList.forEach(kanji => {
        kanji.subTheme = identifySubTheme(kanji.meanings, radicalInfo);
      });
    }
    
    // Group by sub-themes
    const subThemeGroups: Record<string, RadicalKanji[]> = {};
    const uncategorized: RadicalKanji[] = [];
    
    if (includeSubThemes) {
      kanjiList.forEach(kanji => {
        if (kanji.subTheme) {
          if (!subThemeGroups[kanji.subTheme]) {
            subThemeGroups[kanji.subTheme] = [];
          }
          subThemeGroups[kanji.subTheme].push(kanji);
        } else {
          uncategorized.push(kanji);
        }
      });
    }
    
    // Sort kanji by frequency/importance
    const sortKanji = (a: RadicalKanji, b: RadicalKanji) => {
      // First by JLPT level (lower is more important)
      if (a.jlpt !== b.jlpt) {
        if (!a.jlpt) return 1;
        if (!b.jlpt) return -1;
        return a.jlpt - b.jlpt;
      }
      
      // Then by grade
      if (a.grade !== b.grade) {
        if (!a.grade) return 1;
        if (!b.grade) return -1;
        return a.grade - b.grade;
      }
      
      // Then by frequency
      if (a.frequency !== b.frequency) {
        if (!a.frequency) return 1;
        if (!b.frequency) return -1;
        return a.frequency - b.frequency;
      }
      
      return 0;
    };
    
    // Sort all groups
    Object.values(subThemeGroups).forEach(group => group.sort(sortKanji));
    uncategorized.sort(sortKanji);
    
    return NextResponse.json({
      radical: radicalInfo,
      totalCount: kanjiList.length,
      kanji: kanjiList.sort(sortKanji),
      subThemeGroups: includeSubThemes ? subThemeGroups : undefined,
      uncategorized: includeSubThemes ? uncategorized : undefined
    });
  } catch (error) {
    console.error('Error in by-radical API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kanji by radical' },
      { status: 500 }
    );
  }
}

// Get all available radicals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category } = body;
    
    let radicals = Object.values(SEMANTIC_RADICALS);
    
    if (category) {
      radicals = radicals.filter(r => r.category === category);
    }
    
    // Return basic info about each radical
    const radicalInfo = radicals.map(r => ({
      id: r.id,
      radical: r.radical,
      meaning: r.meaning,
      meaningJa: r.meaningJa,
      category: r.category,
      icon: r.icon,
      color: r.color,
      strokeCount: r.strokeCount,
      position: r.position,
      subThemeCount: r.subThemes?.length || 0
    }));
    
    return NextResponse.json({
      radicals: radicalInfo,
      totalCount: radicalInfo.length
    });
  } catch (error) {
    console.error('Error fetching radicals list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch radicals list' },
      { status: 500 }
    );
  }
}