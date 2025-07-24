import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { DynamicAchievementsData } from '@/lib/achievements/types';

const DATA_DIR = path.join(process.cwd(), 'data', 'achievements');
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, 'dynamic-achievements.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

export async function GET() {
  try {
    await ensureDataDirectory();
    
    const fileContent = await readFile(ACHIEVEMENTS_FILE, 'utf-8');
    const data: DynamicAchievementsData = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    // Return empty achievements if file doesn't exist
    const defaultData: DynamicAchievementsData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system',
      achievements: []
    };
    
    return NextResponse.json(defaultData);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: DynamicAchievementsData = await request.json();
    
    // TODO: Add admin authentication check here
    // const user = await getAuthenticatedUser(request);
    // if (!user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    // Validate the data structure
    if (!data.version || !data.achievements || !Array.isArray(data.achievements)) {
      return NextResponse.json(
        { error: 'Invalid data structure' }, 
        { status: 400 }
      );
    }

    // Validate each achievement
    for (const achievement of data.achievements) {
      if (!achievement.id || !achievement.title || !achievement.description) {
        return NextResponse.json(
          { error: `Invalid achievement: ${achievement.id || 'unknown'}` }, 
          { status: 400 }
        );
      }
    }

    await ensureDataDirectory();
    
    // Save to file
    await writeFile(ACHIEVEMENTS_FILE, JSON.stringify(data, null, 2));
    
    // TODO: Optionally save to Firebase for real-time updates
    // await saveToFirebase('admin/achievements', data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving achievements:', error);
    return NextResponse.json(
      { error: 'Failed to save achievements' }, 
      { status: 500 }
    );
  }
}