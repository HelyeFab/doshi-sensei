import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    // List of all JLPT 1 data directories
    const dataDirs = [
      'jlpt_1',
      'jlpt_1_1',
      'jlpt_1_2',
      'jlpt_1_3',
      'jlpt_1_4',
      'jlpt_1_5',
      'jlpt_1_6',
      'jlpt_1_7',
      'jlpt_1_8',
      'jlpt_1_9',
      'jlpt_1_10'
    ];
    
    // Read each JSON file
    for (const dir of dataDirs) {
      const dataPath = path.join(process.cwd(), 'kanji_data', dir, `${dir}.json`);
      if (fs.existsSync(dataPath)) {
        const fileContents = fs.readFileSync(dataPath, 'utf8');
        const kanjiData = JSON.parse(fileContents);
        if (Array.isArray(kanjiData)) {
          allKanjiData.push(...kanjiData);
        }
      }
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N1 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N1 kanji data' }, { status: 500 });
  }
}
