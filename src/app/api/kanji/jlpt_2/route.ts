import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // N2 has multiple folders: jlpt_2, jlpt_2_1, jlpt_2_2, jlpt_2_3
    const folders = [
      'jlpt_2',
      'jlpt_2_1', 'jlpt_2_2', 'jlpt_2_3'
    ];

    let allKanjiData: any[] = [];

    for (const folder of folders) {
      try {
        const filePath = path.join(process.cwd(), 'kanji_data', folder, `${folder}.json`);
        const fileContents = await fs.readFile(filePath, 'utf8');
        const kanjiData = JSON.parse(fileContents);

        if (Array.isArray(kanjiData)) {
          allKanjiData.push(...kanjiData);
        }
      } catch (error) {
        console.log(`Could not load ${folder}, skipping...`);
        // Continue loading other folders even if one fails
      }
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N2 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N2 kanji data' }, { status: 500 });
  }
}
