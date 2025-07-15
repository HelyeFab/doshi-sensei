import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { Story, StoryPage, StoryQuizQuestion } from '@/types/story';
import { JLPTLevel } from '@/types/kanji';

interface MoodBoardKanji {
  kanji: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  jlptLevel: string;
  strokeCount: number;
  examples?: string[];
}

interface MoodBoard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  themeColor: string;
  tags: string[];
  kanjiItems: MoodBoardKanji[];
  createdAt: Date;
  updatedAt: Date;
}

// Configure for API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max execution time

export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  try {
    // Get Firebase Admin from request context
    const admin = (request as any).firebaseAdmin;
    
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is admin
    const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Initialize OpenAI client
    const apiKey = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is missing');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ 
      apiKey,
      timeout: 50000, // 50 second timeout (less than maxDuration)
      maxRetries: 2
    });

    const body = await request.json();
    const { moodBoard }: { moodBoard: MoodBoard } = body;
    
    console.log('📥 Received mood board data:', JSON.stringify(moodBoard, null, 2));

    if (!moodBoard || !moodBoard.kanjiItems || moodBoard.kanjiItems.length === 0) {
      console.error('❌ Invalid mood board data:', moodBoard);
      return NextResponse.json({ error: 'Invalid mood board data' }, { status: 400 });
    }

    // Extract kanji characters and create a formatted list for the prompt
    const kanjiList = moodBoard.kanjiItems.map(item => ({
      kanji: item.kanji,
      meanings: item.meanings || [],
      readings: [...(item.onyomi || []), ...(item.kunyomi || [])]
    }));

    // Generate JLPT level based on the mood board kanji
    const jlptLevels = moodBoard.kanjiItems.map(item => item.jlptLevel);
    const mostCommonLevel = getMostCommonJLPTLevel(jlptLevels) as JLPTLevel;

    console.log('🌸 Generating story for mood board:', moodBoard.title);
    console.log('📚 Using kanji:', kanjiList.map(k => k.kanji).join(', '));
    console.log('🎯 Target JLPT level:', mostCommonLevel);

    // Generate the story content
    const storyPrompt = `You are creating an educational Japanese story for young learners.

MOOD BOARD THEME: ${moodBoard.title}
MOOD BOARD DESCRIPTION: ${moodBoard.description}

REQUIRED KANJI (MUST use ALL of these):
${kanjiList.map(k => `${k.kanji} (${k.meanings.join(', ')})`).join('\n')}

Create a 3-page story that:
1. Is appropriate for young learners (ages 8-15)
2. Uses EVERY kanji from the list above at least once
3. Has 8-10 sentences per page
4. Is at JLPT ${mostCommonLevel} level
5. Has an engaging plot with a clear beginning, middle, and end
6. Teaches a positive moral or life lesson

For each kanji from the mood board, wrap it in special markers: {{MOODKANJI}}kanji{{/MOODKANJI}}
Example: 今日は{{MOODKANJI}}家{{/MOODKANJI}}に帰ります。

IMPORTANT: Use proper furigana with <ruby> tags for ALL kanji, including the mood board kanji.
Example: <ruby>{{MOODKANJI}}家{{/MOODKANJI}}<rt>いえ</rt></ruby>

Return JSON with this structure:
{
  "title": "Story title in Japanese with furigana",
  "titleEn": "Story title in English",
  "description": "Brief description in English",
  "pages": [
    {
      "japaneseText": "Japanese text with furigana ruby tags and {{MOODKANJI}} markers",
      "englishText": "English translation",
      "imagePrompt": "A brief scene description for context"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert Japanese language educator creating stories for young learners. Always use proper furigana with <ruby> tags and ensure all required kanji are used."
        },
        {
          role: "user",
          content: storyPrompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const generatedStoryData = JSON.parse(completion.choices[0].message.content || '{}');

    // Process each page to handle mood board kanji styling
    const processedPages: StoryPage[] = [];
    
    for (let i = 0; i < generatedStoryData.pages.length; i++) {
      const page = generatedStoryData.pages[i];
      
      // Simply remove the mood board kanji markers without adding any styling
      let processedText = page.japaneseText;
      
      // Remove {{MOODKANJI}} and {{/MOODKANJI}} markers
      processedText = processedText.replace(/{{MOODKANJI}}/g, '');
      processedText = processedText.replace(/{{\/MOODKANJI}}/g, '');
      
      processedPages.push({
        pageNumber: i + 1,
        imageUrl: '', // No images for mood board stories
        text: processedText, // This should contain the Japanese text with ruby tags and mood board styling
        translation: page.englishText,
        imageAlt: ''
      });
    }

    // Generate a simple slug from the title
    const slug = generatedStoryData.titleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + Date.now();

    // Create the story object
    const storyId = `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const story: Omit<Story, 'createdAt' | 'updatedAt'> = {
      id: storyId,
      title: generatedStoryData.titleEn,
      titleJa: generatedStoryData.title,
      description: generatedStoryData.description,
      theme: 'Mood Board Story',
      jlptLevel: mostCommonLevel,
      pages: processedPages,
      quiz: [], // No quiz for mood board stories initially
      
      // Metadata
      authorId: decodedToken.email || 'admin',
      status: 'published', // Publish immediately as requested
      
      // Stats
      viewCount: 0,
      completionCount: 0,
      
      // SEO
      slug: slug,
      tags: ['mood-board-story', ...moodBoard.tags],
      coverImageUrl: '', // No cover image for mood board stories
      
      // Add mood board reference in the story object
      seoDescription: `A story created from the "${moodBoard.title}" kanji mood board, featuring ${moodBoard.kanjiItems.length} kanji.`,
    };

    // Save to Firestore using Firebase Admin
    const storyData = {
      ...story,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(), // Publish immediately
      moodBoardId: moodBoard.id,
      moodBoardTitle: moodBoard.title,
      moodBoardKanji: kanjiList.map(k => k.kanji), // Store the kanji list for reference
    };

    // Use Firebase Admin to save the story
    await admin.firestore().collection('stories').doc(storyId).set(storyData);

    console.log('✅ Story generated and published:', storyId);

    return NextResponse.json({
      success: true,
      storyId,
      story: {
        ...story,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      }
    });

  } catch (error) {
    console.error('Error generating mood board story:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate story' },
      { status: 500 }
    );
  }
});

function getMostCommonJLPTLevel(levels: string[]): string {
  const levelCounts = levels.reduce((acc, level) => {
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let maxCount = 0;
  let mostCommon = 'N5';
  
  for (const [level, count] of Object.entries(levelCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = level;
    }
  }
  
  return mostCommon;
}