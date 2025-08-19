import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    // Read the JSON file directly from the file system
    const dataPath = path.join(process.cwd(), 'kanji_data', 'jlpt_5', 'jlpt_5.json');
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const kanjiData = JSON.parse(fileContents);
    
    return NextResponse.json(kanjiData);
  } catch (error) {
    console.error('Error loading N5 kanji data:', error);
    return NextResponse.json({ error: 'Failed to load N5 kanji data' }, { status: 500 });
  }
}
