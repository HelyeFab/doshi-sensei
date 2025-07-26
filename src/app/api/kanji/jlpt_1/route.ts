import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // N1 has multiple folders: jlpt_1, jlpt_1_1, jlpt_1_2, ..., jlpt_1_10
    const folders = [
      'jlpt_1',
      'jlpt_1_1', 'jlpt_1_2', 'jlpt_1_3', 'jlpt_1_4', 'jlpt_1_5',
      'jlpt_1_6', 'jlpt_1_7', 'jlpt_1_8', 'jlpt_1_9', 'jlpt_1_10'
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
    console.error('Error loading N1 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N1 kanji data' }, { status: 500 });
  }
}
