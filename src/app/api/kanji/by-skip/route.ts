import { NextRequest, NextResponse } from 'next/server';
import { 
  SKIP_PATTERNS, 
  parseSkipCode, 
  categorizeBySkip, 
  getSubCategory,
  identifyVisualPatterns,
  type SkipPattern, 
  type SkipKanji 
} from '@/lib/kanji/skip';
import { getAllKanji } from '@/services/kanji-data-service';

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours (SKIP data doesn't change often)

// Fetch kanji with SKIP codes from Kanji Alive API or our database
async function fetchSkipData(pattern?: SkipPattern, grade?: number): Promise<SkipKanji[]> {
  const cacheKey = `skip_${pattern || 'all'}_${grade || 'all'}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // First try to use our kanji database
    const allKanji = await getAllKanji();
    
    if (allKanji.length > 0) {
      // Visual pattern mappings based on common radicals and structures
      const leftRightRadicals = ['亻', '扌', '氵', '忄', '木', '火', '犭', '礻', '衤', '訁', '讠', '钅', '飠'];
      const upDownRadicals = ['艹', '宀', '雨', '竹', '穴', '罒', '冖'];
      const enclosureRadicals = ['囗', '門', '鬥', '匚', '凵', '勹'];
      
      // Map our kanji to SKIP format
      const skipData: SkipKanji[] = allKanji.map(k => {
        let skipPattern: SkipPattern = 'solid';
        let skipCode = '4-' + (k.stroke_count || 0);
        
        const kanjiChar = k.kanji;
        
        // Check for left-right pattern (most common)
        if (leftRightRadicals.some(r => kanjiChar.includes(r)) || 
            '持時話語体休作使例供係信倍候借値停健側働億優清情性快怖悪恐悲惜'.includes(kanjiChar)) {
          skipPattern = 'left-right';
          const leftStrokes = 3; // Approximate
          skipCode = `1-${leftStrokes}-${Math.max(1, (k.stroke_count || 6) - leftStrokes)}`;
        }
        // Check for up-down pattern
        else if (upDownRadicals.some(r => kanjiChar.includes(r)) ||
                '早雪思意忘草学空花若英茶薬葉落雲電雷露霜'.includes(kanjiChar)) {
          skipPattern = 'up-down';
          const topStrokes = 3; // Approximate
          skipCode = `2-${topStrokes}-${Math.max(1, (k.stroke_count || 6) - topStrokes)}`;
        }
        // Check for enclosure pattern
        else if (enclosureRadicals.some(r => kanjiChar.includes(r)) ||
                '国園囲図回困団因固圏円周囲問閉開間関閣闇'.includes(kanjiChar)) {
          skipPattern = 'enclosure';
          const outerStrokes = 3; // Approximate
          skipCode = `3-${outerStrokes}-${Math.max(1, (k.stroke_count || 6) - outerStrokes)}`;
        }
        // Simple kanji are solid
        else if (k.stroke_count && k.stroke_count <= 6) {
          skipPattern = 'solid';
          skipCode = '4-' + k.stroke_count;
        }
        // Default to left-right for complex kanji (most common)
        else {
          skipPattern = 'left-right';
          const leftStrokes = Math.floor((k.stroke_count || 8) / 2);
          skipCode = `1-${leftStrokes}-${Math.max(1, (k.stroke_count || 8) - leftStrokes)}`;
        }
        
        return {
          kanji: k.kanji,
          skip: { 
            pattern: skipPattern, 
            code: skipCode,
            ...(skipPattern === 'left-right' && { 
              leftStrokes: parseInt(skipCode.split('-')[1]), 
              rightStrokes: parseInt(skipCode.split('-')[2]) 
            }),
            ...(skipPattern === 'up-down' && { 
              topStrokes: parseInt(skipCode.split('-')[1]), 
              bottomStrokes: parseInt(skipCode.split('-')[2]) 
            }),
            ...(skipPattern === 'enclosure' && { 
              outerStrokes: parseInt(skipCode.split('-')[1]), 
              innerStrokes: parseInt(skipCode.split('-')[2]) 
            }),
            ...(skipPattern === 'solid' && { 
              totalStrokes: k.stroke_count || 3 
            })
          },
          meanings: k.meanings || [k.meaning],
          readings: {
            kun: k.kunyomi || [],
            on: k.onyomi || []
          },
          jlpt: k.jlpt,
          grade: k.grade,
          frequency: k.frequency,
          strokeCount: k.stroke_count || 0,
          radicals: k.radicals || []
        };
      });
      
      // Filter by pattern if specified
      let filtered = skipData;
      if (pattern) {
        filtered = skipData.filter(k => k.skip.pattern === pattern);
      }
      
      // Filter by grade if specified
      if (grade) {
        filtered = filtered.filter(k => k.grade === grade);
      }
      
      // Sort by frequency/importance
      filtered.sort((a, b) => {
        if (a.jlpt !== b.jlpt) {
          return (a.jlpt || 99) - (b.jlpt || 99);
        }
        return (a.frequency || 9999) - (b.frequency || 9999);
      });
      
      // Cache the result
      cache.set(cacheKey, { data: filtered, timestamp: Date.now() });
      
      return filtered;
    }
    
    // Note: Kanji Alive API requires API key
    const apiKey = process.env.KANJI_ALIVE_API_KEY;
    
    if (!apiKey) {
      // Fallback to sample data if no API key and no database
      return getSampleSkipData(pattern);
    }
    
    // Kanji Alive API endpoint
    const baseUrl = 'https://kanjialive-api.p.rapidapi.com/api/public/kanji';
    let url = baseUrl;
    
    if (grade) {
      url += `/grade/${grade}`;
    } else {
      url += '/all';
    }
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'kanjialive-api.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      console.error('Kanji Alive API error:', response.status);
      return getSampleSkipData(pattern);
    }
    
    const data = await response.json();
    
    // Transform Kanji Alive data to our SkipKanji format
    const skipKanji: SkipKanji[] = data.map((item: any) => {
      const skipCode = parseSkipCode(item.references?.kodansha?.skip || '');
      
      return {
        kanji: item.kanji.character,
        skip: skipCode || { pattern: 'solid' as SkipPattern, code: '4-0' },
        meanings: item.kanji.meaning?.english?.split(', ') || [],
        readings: {
          kun: item.kanji.kunyomi?.romaji?.split(', ') || [],
          on: item.kanji.onyomi?.romaji?.split(', ') || []
        },
        jlpt: item.references?.grade_level,
        grade: item.references?.grade,
        frequency: item.references?.freq,
        strokeCount: item.kanji.strokes?.count || 0,
        radicals: item.radical?.character ? [item.radical.character] : []
      };
    });
    
    // Filter by pattern if specified
    let filtered = skipKanji;
    if (pattern) {
      filtered = skipKanji.filter(k => k.skip.pattern === pattern);
    }
    
    cache.set(cacheKey, { data: filtered, timestamp: Date.now() });
    return filtered;
    
  } catch (error) {
    console.error('Error fetching SKIP data:', error);
    return getSampleSkipData(pattern);
  }
}

// Sample SKIP data for demonstration (when API is unavailable)
function getSampleSkipData(pattern?: SkipPattern): SkipKanji[] {
  const sampleData: SkipKanji[] = [
    // Left-Right Pattern
    { kanji: '明', skip: { pattern: 'left-right', leftStrokes: 4, rightStrokes: 4, code: '1-4-4' }, meanings: ['bright', 'clear'], readings: { kun: ['あか', 'あき'], on: ['メイ', 'ミョウ'] }, jlpt: 5, grade: 2, frequency: 67, strokeCount: 8 },
    { kanji: '持', skip: { pattern: 'left-right', leftStrokes: 3, rightStrokes: 6, code: '1-3-6' }, meanings: ['hold', 'have'], readings: { kun: ['も'], on: ['ジ'] }, jlpt: 4, grade: 3, frequency: 119, strokeCount: 9 },
    { kanji: '時', skip: { pattern: 'left-right', leftStrokes: 4, rightStrokes: 6, code: '1-4-6' }, meanings: ['time', 'hour'], readings: { kun: ['とき'], on: ['ジ'] }, jlpt: 5, grade: 2, frequency: 16, strokeCount: 10 },
    { kanji: '話', skip: { pattern: 'left-right', leftStrokes: 7, rightStrokes: 6, code: '1-7-6' }, meanings: ['talk', 'story'], readings: { kun: ['はな', 'はなし'], on: ['ワ'] }, jlpt: 5, grade: 2, frequency: 134, strokeCount: 13 },
    { kanji: '語', skip: { pattern: 'left-right', leftStrokes: 7, rightStrokes: 7, code: '1-7-7' }, meanings: ['language', 'word'], readings: { kun: ['かた'], on: ['ゴ'] }, jlpt: 5, grade: 2, frequency: 301, strokeCount: 14 },
    { kanji: '体', skip: { pattern: 'left-right', leftStrokes: 2, rightStrokes: 5, code: '1-2-5' }, meanings: ['body'], readings: { kun: ['からだ'], on: ['タイ', 'テイ'] }, jlpt: 4, grade: 2, frequency: 88, strokeCount: 7 },
    { kanji: '休', skip: { pattern: 'left-right', leftStrokes: 2, rightStrokes: 4, code: '1-2-4' }, meanings: ['rest'], readings: { kun: ['やす'], on: ['キュウ'] }, jlpt: 5, grade: 1, frequency: 642, strokeCount: 6 },
    { kanji: '作', skip: { pattern: 'left-right', leftStrokes: 2, rightStrokes: 5, code: '1-2-5' }, meanings: ['make'], readings: { kun: ['つく'], on: ['サク', 'サ'] }, jlpt: 4, grade: 2, frequency: 103, strokeCount: 7 },
    
    // Up-Down Pattern
    { kanji: '早', skip: { pattern: 'up-down', topStrokes: 4, bottomStrokes: 2, code: '2-4-2' }, meanings: ['early', 'fast'], readings: { kun: ['はや'], on: ['ソウ', 'サッ'] }, jlpt: 4, grade: 1, frequency: 402, strokeCount: 6 },
    { kanji: '雪', skip: { pattern: 'up-down', topStrokes: 8, bottomStrokes: 3, code: '2-8-3' }, meanings: ['snow'], readings: { kun: ['ゆき'], on: ['セツ'] }, jlpt: 3, grade: 2, frequency: 1131, strokeCount: 11 },
    { kanji: '思', skip: { pattern: 'up-down', topStrokes: 5, bottomStrokes: 4, code: '2-5-4' }, meanings: ['think'], readings: { kun: ['おも'], on: ['シ'] }, jlpt: 4, grade: 2, frequency: 132, strokeCount: 9 },
    { kanji: '意', skip: { pattern: 'up-down', topStrokes: 8, bottomStrokes: 5, code: '2-8-5' }, meanings: ['idea', 'mind'], readings: { kun: [], on: ['イ'] }, jlpt: 3, grade: 3, frequency: 99, strokeCount: 13 },
    { kanji: '忘', skip: { pattern: 'up-down', topStrokes: 3, bottomStrokes: 4, code: '2-3-4' }, meanings: ['forget'], readings: { kun: ['わす'], on: ['ボウ'] }, jlpt: 3, grade: 6, frequency: 1129, strokeCount: 7 },
    { kanji: '草', skip: { pattern: 'up-down', topStrokes: 3, bottomStrokes: 6, code: '2-3-6' }, meanings: ['grass'], readings: { kun: ['くさ'], on: ['ソウ'] }, jlpt: 3, grade: 1, frequency: 967, strokeCount: 9 },
    { kanji: '学', skip: { pattern: 'up-down', topStrokes: 3, bottomStrokes: 5, code: '2-3-5' }, meanings: ['study', 'learn'], readings: { kun: ['まな'], on: ['ガク'] }, jlpt: 5, grade: 1, frequency: 63, strokeCount: 8 },
    { kanji: '空', skip: { pattern: 'up-down', topStrokes: 3, bottomStrokes: 5, code: '2-3-5' }, meanings: ['sky', 'empty'], readings: { kun: ['そら', 'あ', 'から'], on: ['クウ'] }, jlpt: 4, grade: 1, frequency: 304, strokeCount: 8 },
    
    // Enclosure Pattern
    { kanji: '国', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 5, code: '3-3-5' }, meanings: ['country'], readings: { kun: ['くに'], on: ['コク'] }, jlpt: 5, grade: 2, frequency: 3, strokeCount: 8 },
    { kanji: '園', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 10, code: '3-3-10' }, meanings: ['garden', 'park'], readings: { kun: ['その'], on: ['エン'] }, jlpt: 3, grade: 2, frequency: 628, strokeCount: 13 },
    { kanji: '囲', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 4, code: '3-3-4' }, meanings: ['surround'], readings: { kun: ['かこ'], on: ['イ'] }, jlpt: 2, grade: 4, frequency: 771, strokeCount: 7 },
    { kanji: '図', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 4, code: '3-3-4' }, meanings: ['diagram', 'plan'], readings: { kun: ['はか'], on: ['ズ', 'ト'] }, jlpt: 3, grade: 2, frequency: 539, strokeCount: 7 },
    { kanji: '回', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 3, code: '3-3-3' }, meanings: ['times', 'rotate'], readings: { kun: ['まわ'], on: ['カイ', 'エ'] }, jlpt: 4, grade: 2, frequency: 50, strokeCount: 6 },
    { kanji: '困', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 4, code: '3-3-4' }, meanings: ['trouble'], readings: { kun: ['こま'], on: ['コン'] }, jlpt: 3, grade: 6, frequency: 843, strokeCount: 7 },
    { kanji: '団', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 3, code: '3-3-3' }, meanings: ['group'], readings: { kun: [], on: ['ダン', 'トン'] }, jlpt: 2, grade: 5, frequency: 213, strokeCount: 6 },
    { kanji: '因', skip: { pattern: 'enclosure', outerStrokes: 3, innerStrokes: 3, code: '3-3-3' }, meanings: ['cause'], readings: { kun: ['よ'], on: ['イン'] }, jlpt: 2, grade: 5, frequency: 636, strokeCount: 6 },
    
    // Solid Pattern
    { kanji: '大', skip: { pattern: 'solid', totalStrokes: 3, code: '4-3' }, meanings: ['big', 'large'], readings: { kun: ['おお'], on: ['ダイ', 'タイ'] }, jlpt: 5, grade: 1, frequency: 7, strokeCount: 3 },
    { kanji: '火', skip: { pattern: 'solid', totalStrokes: 4, code: '4-4' }, meanings: ['fire'], readings: { kun: ['ひ'], on: ['カ'] }, jlpt: 5, grade: 1, frequency: 574, strokeCount: 4 },
    { kanji: '水', skip: { pattern: 'solid', totalStrokes: 4, code: '4-4' }, meanings: ['water'], readings: { kun: ['みず'], on: ['スイ'] }, jlpt: 5, grade: 1, frequency: 223, strokeCount: 4 },
    { kanji: '女', skip: { pattern: 'solid', totalStrokes: 3, code: '4-3' }, meanings: ['woman'], readings: { kun: ['おんな'], on: ['ジョ', 'ニョ'] }, jlpt: 5, grade: 1, frequency: 151, strokeCount: 3 },
    { kanji: '子', skip: { pattern: 'solid', totalStrokes: 3, code: '4-3' }, meanings: ['child'], readings: { kun: ['こ'], on: ['シ', 'ス'] }, jlpt: 5, grade: 1, frequency: 72, strokeCount: 3 },
    { kanji: '小', skip: { pattern: 'solid', totalStrokes: 3, code: '4-3' }, meanings: ['small'], readings: { kun: ['ちい', 'こ', 'お'], on: ['ショウ'] }, jlpt: 5, grade: 1, frequency: 114, strokeCount: 3 },
    { kanji: '山', skip: { pattern: 'solid', totalStrokes: 3, code: '4-3' }, meanings: ['mountain'], readings: { kun: ['やま'], on: ['サン'] }, jlpt: 5, grade: 1, frequency: 131, strokeCount: 3 },
    { kanji: '川', skip: { pattern: 'solid', totalStrokes: 3, code: '4-3' }, meanings: ['river'], readings: { kun: ['かわ'], on: ['セン'] }, jlpt: 5, grade: 1, frequency: 181, strokeCount: 3 }
  ];
  
  if (pattern) {
    return sampleData.filter(k => k.skip.pattern === pattern);
  }
  
  return sampleData;
}

// GET endpoint for fetching kanji by SKIP pattern
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pattern = searchParams.get('pattern') as SkipPattern | null;
  const grade = searchParams.get('grade');
  const groupBySubcategory = searchParams.get('subcategories') === 'true';
  
  try {
    // Fetch SKIP data
    const kanjiList = await fetchSkipData(
      pattern || undefined,
      grade ? parseInt(grade) : undefined
    );
    
    // Categorize by pattern
    const categorized = categorizeBySkip(kanjiList);
    
    // Group by subcategories if requested
    let subcategorized: Record<string, Record<string, SkipKanji[]>> = {};
    
    if (groupBySubcategory) {
      Object.entries(categorized).forEach(([patternKey, kanjiArray]) => {
        subcategorized[patternKey] = {};
        
        kanjiArray.forEach(kanji => {
          const subCategory = getSubCategory(kanji);
          const subKey = subCategory?.id || 'other';
          
          if (!subcategorized[patternKey][subKey]) {
            subcategorized[patternKey][subKey] = [];
          }
          
          subcategorized[patternKey][subKey].push(kanji);
        });
      });
    }
    
    // Add visual patterns to each kanji
    const enrichedKanji = kanjiList.map(kanji => ({
      ...kanji,
      visualPatterns: identifyVisualPatterns(kanji.kanji)
    }));
    
    // Response data
    const responseData = {
      patterns: pattern ? SKIP_PATTERNS[pattern] : SKIP_PATTERNS,
      totalCount: kanjiList.length,
      kanji: enrichedKanji,
      categorized: categorized,
      subcategorized: groupBySubcategory ? subcategorized : undefined,
      stats: {
        leftRight: categorized['left-right'].length,
        upDown: categorized['up-down'].length,
        enclosure: categorized['enclosure'].length,
        solid: categorized['solid'].length
      }
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error in by-skip API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SKIP kanji data' },
      { status: 500 }
    );
  }
}

// POST endpoint for searching kanji by SKIP code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skipCode } = body;
    
    if (!skipCode) {
      return NextResponse.json(
        { error: 'SKIP code is required' },
        { status: 400 }
      );
    }
    
    const parsedSkip = parseSkipCode(skipCode);
    if (!parsedSkip) {
      return NextResponse.json(
        { error: 'Invalid SKIP code format' },
        { status: 400 }
      );
    }
    
    // Fetch all kanji for the pattern
    const kanjiList = await fetchSkipData(parsedSkip.pattern);
    
    // Filter by exact SKIP code
    const matches = kanjiList.filter(k => k.skip.code === skipCode);
    
    return NextResponse.json({
      skipCode: parsedSkip,
      matches: matches,
      count: matches.length
    });
    
  } catch (error) {
    console.error('Error searching by SKIP code:', error);
    return NextResponse.json(
      { error: 'Failed to search by SKIP code' },
      { status: 500 }
    );
  }
}