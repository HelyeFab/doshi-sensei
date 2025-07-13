import { NextRequest, NextResponse } from 'next/server';
import { withFirebaseAdmin } from '@/utils/api-wrapper';
import OpenAI from 'openai';
import { JLPTLevel } from '@/types/kanji';

// Configure for API route timeout
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for Netlify Functions

interface GenerateQuizRequest {
  storyTitle: string;
  storyPages: Array<{
    text: string;
    translation: string;
  }>;
  jlptLevel: JLPTLevel;
  questionCount?: number;
}

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

    const body: GenerateQuizRequest = await request.json();
    const { storyTitle, storyPages, jlptLevel, questionCount = 5 } = body;

    // Combine story text for context
    const fullStory = storyPages.map((page, i) => 
      `Page ${i + 1}:\nJapanese: ${page.text}\nEnglish: ${page.translation}`
    ).join('\n\n');

    // Initialize OpenAI client with timeout configuration
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 20000, // 20 second timeout for quiz
      maxRetries: 1, // Retry once on failure
    });

    // Simplified quiz prompt - only use story summaries, not full text
    const storyOutline = storyPages.map((page, i) => 
      `Page ${i + 1}: ${page.translation.substring(0, 50)}...`
    ).join('\n');

    const quizPrompt = `Create ${questionCount} simple questions about this story:
Title: ${storyTitle}
Summary: ${storyOutline}

Return JSON array with ${questionCount} questions:
[
  {
    "question": "Simple question about the story",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Brief reason"
  }
]

Keep questions very simple and short.`;

    const quizResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using GPT-4o-mini for consistency
      messages: [
        {
          role: 'system',
          content: 'You are an expert in creating educational assessments for Japanese language learners. Create engaging comprehension questions that test understanding without being too difficult.'
        },
        {
          role: 'user',
          content: quizPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500 // Limit tokens for quiz
    }).catch(error => {
      console.error('OpenAI quiz generation error:', error);
      throw error;
    });

    const quizData = JSON.parse(quizResponse.choices[0].message.content || '{"questions": []}');
    const questions = quizData.questions || quizData || [];

    // Add IDs to questions
    const questionsWithIds = questions.map((q: any, index: number) => ({
      id: `q${index + 1}`,
      ...q
    }));

    return NextResponse.json({
      success: true,
      quiz: questionsWithIds.slice(0, questionCount), // Ensure we don't exceed requested count
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    );
  }
});