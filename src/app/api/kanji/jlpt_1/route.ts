import { NextResponse } from 'next/server';
import kanjiData1 from '@kanji_data/jlpt_1/jlpt_1.json';
import kanjiData1_1 from '@kanji_data/jlpt_1_1/jlpt_1_1.json';
import kanjiData1_2 from '@kanji_data/jlpt_1_2/jlpt_1_2.json';
import kanjiData1_3 from '@kanji_data/jlpt_1_3/jlpt_1_3.json';
import kanjiData1_4 from '@kanji_data/jlpt_1_4/jlpt_1_4.json';
import kanjiData1_5 from '@kanji_data/jlpt_1_5/jlpt_1_5.json';
import kanjiData1_6 from '@kanji_data/jlpt_1_6/jlpt_1_6.json';
import kanjiData1_7 from '@kanji_data/jlpt_1_7/jlpt_1_7.json';
import kanjiData1_8 from '@kanji_data/jlpt_1_8/jlpt_1_8.json';
import kanjiData1_9 from '@kanji_data/jlpt_1_9/jlpt_1_9.json';
import kanjiData1_10 from '@kanji_data/jlpt_1_10/jlpt_1_10.json';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    if (Array.isArray(kanjiData1)) {
      allKanjiData.push(...kanjiData1);
    }
    if (Array.isArray(kanjiData1_1)) {
      allKanjiData.push(...kanjiData1_1);
    }
    if (Array.isArray(kanjiData1_2)) {
      allKanjiData.push(...kanjiData1_2);
    }
    if (Array.isArray(kanjiData1_3)) {
      allKanjiData.push(...kanjiData1_3);
    }
    if (Array.isArray(kanjiData1_4)) {
      allKanjiData.push(...kanjiData1_4);
    }
    if (Array.isArray(kanjiData1_5)) {
      allKanjiData.push(...kanjiData1_5);
    }
    if (Array.isArray(kanjiData1_6)) {
      allKanjiData.push(...kanjiData1_6);
    }
    if (Array.isArray(kanjiData1_7)) {
      allKanjiData.push(...kanjiData1_7);
    }
    if (Array.isArray(kanjiData1_8)) {
      allKanjiData.push(...kanjiData1_8);
    }
    if (Array.isArray(kanjiData1_9)) {
      allKanjiData.push(...kanjiData1_9);
    }
    if (Array.isArray(kanjiData1_10)) {
      allKanjiData.push(...kanjiData1_10);
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N1 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N1 kanji data' }, { status: 500 });
  }
}
