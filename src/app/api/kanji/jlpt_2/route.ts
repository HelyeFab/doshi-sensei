import { NextResponse } from 'next/server';
import kanjiData2 from '@kanji_data/jlpt_2/jlpt_2.json';
import kanjiData2_1 from '@kanji_data/jlpt_2_1/jlpt_2_1.json';
import kanjiData2_2 from '@kanji_data/jlpt_2_2/jlpt_2_2.json';
import kanjiData2_3 from '@kanji_data/jlpt_2_3/jlpt_2_3.json';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    if (Array.isArray(kanjiData2)) {
      allKanjiData.push(...kanjiData2);
    }
    if (Array.isArray(kanjiData2_1)) {
      allKanjiData.push(...kanjiData2_1);
    }
    if (Array.isArray(kanjiData2_2)) {
      allKanjiData.push(...kanjiData2_2);
    }
    if (Array.isArray(kanjiData2_3)) {
      allKanjiData.push(...kanjiData2_3);
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N2 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N2 kanji data' }, { status: 500 });
  }
}
