import { NextResponse } from 'next/server';
import kanjiData from '@kanji_data/jlpt_5/jlpt_5.json';

export async function GET() {
  try {
    return NextResponse.json(kanjiData);
  } catch (error) {
    console.error('Error loading N5 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N5 kanji data' }, { status: 500 });
  }
}
