import { NextResponse } from 'next/server';
import kanjiData3 from '@kanji_data/jlpt_3/jlpt_3.json';
import kanjiData3_1 from '@kanji_data/jlp_3_1/jlpt_3_1.json';
import kanjiData3_2 from '@kanji_data/jlpt_3_2/jlpt_3_2.json';
import kanjiData3_3 from '@kanji_data/jlpt_3_3/jlpt_3_3.json';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    if (Array.isArray(kanjiData3)) {
      allKanjiData.push(...kanjiData3);
    }
    if (Array.isArray(kanjiData3_1)) {
      allKanjiData.push(...kanjiData3_1);
    }
    if (Array.isArray(kanjiData3_2)) {
      allKanjiData.push(...kanjiData3_2);
    }
    if (Array.isArray(kanjiData3_3)) {
      allKanjiData.push(...kanjiData3_3);
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N3 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N3 kanji data' }, { status: 500 });
  }
}
