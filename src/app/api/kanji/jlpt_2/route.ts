import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    // List of all JLPT 2 data directories
    const dataDirs = [
      'jlpt_2',
      'jlpt_2_1',
      'jlpt_2_2',
      'jlpt_2_3'
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
    console.error('Error loading N2 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N2 kanji data' }, { status: 500 });
  }
}
