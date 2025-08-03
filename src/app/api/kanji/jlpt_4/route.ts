import { NextResponse } from 'next/server';
import kanjiData4 from '@kanji_data/jlpt_4/jlpt_4.json';
import kanjiData4_1 from '@kanji_data/jlpt_4_1/jlpt_4_1.json';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    if (Array.isArray(kanjiData4)) {
      allKanjiData.push(...kanjiData4);
    }
    if (Array.isArray(kanjiData4_1)) {
      allKanjiData.push(...kanjiData4_1);
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N4 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N4 kanji data' }, { status: 500 });
  }
}
