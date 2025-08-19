import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const allKanjiData: any[] = [];
    
    // List of all JLPT 3 data directories (fixed typo: jlp_3_1 -> jlpt_3_1)
    const dataDirs = [
      'jlpt_3',
      'jlpt_3_1',
      'jlpt_3_2',
      'jlpt_3_3'
    ];
    
    // Also check for the typo version in case the directory exists with that name
    const typoDir = 'jlp_3_1';
    const typoPath = path.join(process.cwd(), 'kanji_data', typoDir, 'jlpt_3_1.json');
    if (fs.existsSync(typoPath)) {
      dataDirs.push(typoDir);
    }
    
    // Read each JSON file
    for (const dir of dataDirs) {
      const fileName = dir === 'jlp_3_1' ? 'jlpt_3_1.json' : `${dir}.json`;
      const dataPath = path.join(process.cwd(), 'kanji_data', dir, fileName);
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
    console.error('Error loading N3 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N3 kanji data' }, { status: 500 });
  }
}
