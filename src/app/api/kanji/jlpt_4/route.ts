import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // N4 has multiple folders: jlpt_4, jlpt_4_1
    const folders = [
      'jlpt_4',
      'jlpt_4_1'
    ];

    const allKanjiData: any[] = [];

    for (const folder of folders) {
      try {
        const filePath = path.join(process.cwd(), 'kanji_data', folder, `${folder}.json`);
        const fileContents = await fs.readFile(filePath, 'utf8');
        const kanjiData = JSON.parse(fileContents);

        if (Array.isArray(kanjiData)) {
          allKanjiData.push(...kanjiData);
        }
      } catch (error) {
        // Continue loading other folders even if one fails
      }
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N4 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N4 kanji data' }, { status: 500 });
  }
}
