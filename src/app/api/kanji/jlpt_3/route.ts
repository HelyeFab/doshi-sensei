import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // N3 has multiple folders: jlpt_3, jlp_3_1 (note typo), jlpt_3_2, jlpt_3_3
    const folderConfigs = [
      { folder: 'jlpt_3', file: 'jlpt_3.json' },
      { folder: 'jlp_3_1', file: 'jlpt_3_1.json' }, // Note: folder has typo but file doesn't
      { folder: 'jlpt_3_2', file: 'jlpt_3_2.json' },
      { folder: 'jlpt_3_3', file: 'jlpt_3_3.json' }
    ];

    let allKanjiData: any[] = [];

    for (const config of folderConfigs) {
      try {
        const filePath = path.join(process.cwd(), 'kanji_data', config.folder, config.file);
        const fileContents = await fs.readFile(filePath, 'utf8');
        const kanjiData = JSON.parse(fileContents);

        if (Array.isArray(kanjiData)) {
          allKanjiData.push(...kanjiData);
        }
      } catch (error) {
        console.log(`Could not load ${config.folder}, skipping...`);
        // Continue loading other folders even if one fails
      }
    }

    return NextResponse.json(allKanjiData);
  } catch (error) {
    console.error('Error loading N3 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N3 kanji data' }, { status: 500 });
  }
}
