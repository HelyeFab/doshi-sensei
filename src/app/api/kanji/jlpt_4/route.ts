import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    // Read the first JSON file
    const dataPath4 = path.join(process.cwd(), 'kanji_data', 'jlpt_4', 'jlpt_4.json');
    if (fs.existsSync(dataPath4)) {
      const fileContents4 = fs.readFileSync(dataPath4, 'utf8');
      const kanjiData4 = JSON.parse(fileContents4);
      if (Array.isArray(kanjiData4)) {
        allKanjiData.push(...kanjiData4);
      }
    }
    
    // Read the second JSON file
    const dataPath4_1 = path.join(process.cwd(), 'kanji_data', 'jlpt_4_1', 'jlpt_4_1.json');
    if (fs.existsSync(dataPath4_1)) {
      const fileContents4_1 = fs.readFileSync(dataPath4_1, 'utf8');
      const kanjiData4_1 = JSON.parse(fileContents4_1);
      if (Array.isArray(kanjiData4_1)) {
        allKanjiData.push(...kanjiData4_1);
      }
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N4 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N4 kanji data' }, { status: 500 });
  }
}
