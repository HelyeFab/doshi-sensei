import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

interface ArticleValidationResult {
  qualityScore: number; // 0-100
  jlptLevel: string; // e.g., "N3-N2"
  issues: string[];
  suggestions: string[];
  enhancedContent?: string;
  canBeAutoFixed: boolean;
  imageKeywords: string[];
  contentStructure: {
    hasProperIntroduction: boolean;
    hasProperBody: boolean;
    hasProperConclusion: boolean;
    isComplete: boolean;
  };
}

// Process article in chunks to avoid token limits
const CHUNK_SIZE = 1000; // Characters per chunk for analysis

function chunkText(text: string, size: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { 
      title, 
      content, 
      source,
      currentJlptLevel 
    } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Valid article content is required' },
        { status: 400 }
      );
    }

    // Quick validation - if content is too short, it's likely incomplete
    if (content.length < 100) {
      return NextResponse.json({
        qualityScore: 0,
        jlptLevel: 'Unknown',
        issues: ['Content too short - likely incomplete article'],
        suggestions: ['Article needs to be re-scraped or discarded'],
        canBeAutoFixed: false,
        imageKeywords: [],
        contentStructure: {
          hasProperIntroduction: false,
          hasProperBody: false,
          hasProperConclusion: false,
          isComplete: false
        }
      });
    }

    // Sample the content for JLPT analysis (middle 1000 characters)
    const sampleStart = Math.max(0, Math.floor((content.length - 1000) / 2));
    const contentSample = content.slice(sampleStart, sampleStart + 1000);

    // Step 1: Analyze content quality and structure
    const qualitySystemPrompt = `You are an expert Japanese language educator and content quality analyst.
Analyze this Japanese article for learning purposes and provide a detailed quality assessment.

ANALYSIS CRITERIA:
1. Language Quality: Is it primarily Japanese? (Note: English for names, quotes, or terms being explained is ACCEPTABLE)
2. Content Completeness: Does it have introduction, body, and conclusion?
3. Educational Value: Is it suitable for Japanese language learners?
4. Text Structure: Are sentences well-formed and grammatically correct?
5. Readability: Is the content easy to follow and understand?
6. English Usage: If English appears, is it intentional (names, quotes, technical terms) or accidental (UI elements, ads)?

OUTPUT FORMAT (JSON):
{
  "qualityScore": [0-100 based on overall quality],
  "jlptLevel": "[estimated JLPT range, e.g., 'N4-N3', 'N2-N1']",
  "issues": [array of specific issues found],
  "suggestions": [array of improvement suggestions],
  "canBeAutoFixed": [true if AI can fix the issues, false if content is fundamentally broken],
  "contentStructure": {
    "hasProperIntroduction": boolean,
    "hasProperBody": boolean,
    "hasProperConclusion": boolean,
    "isComplete": boolean
  },
  "hasEnglishText": boolean,
  "hasMixedLanguages": boolean,
  "imageKeywords": [array of 3-5 keywords that represent the article's topic for image search]
}`;

    const qualityCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: qualitySystemPrompt },
        { role: "user", content: `Article Title: ${title}\n\nContent Sample for JLPT Analysis:\n${contentSample}\n\nFull Content:\n${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}` }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const validationResult = JSON.parse(qualityCompletion.choices[0].message.content || '{}');

    // Step 2: If content can be auto-fixed and quality is between 40-70, attempt enhancement
    let enhancedContent = undefined;
    if (validationResult.canBeAutoFixed && validationResult.qualityScore >= 40 && validationResult.qualityScore <= 70) {

      const enhanceSystemPrompt = `You are an expert Japanese content editor. 
Your task is to clean and enhance Japanese articles for language learners.

IMPORTANT CONTEXT: Some English text may be INTENTIONAL and should be preserved:
- English terms being taught or explained (e.g., 「Hello」は挨拶です)
- Company/product names (Apple, iPhone, Microsoft)
- Person names (Joe Biden, Taylor Swift)
- Direct quotes from English sources
- Technical terms commonly used in katakana or English
- English text that is the SUBJECT of the article

WHAT TO REMOVE:
- Navigation text (e.g., "Next", "Previous", "Share")
- Website UI elements (e.g., "Subscribe", "Comments")
- Advertisement text
- Copyright notices
- Meta information not part of the article content
- Accidental English translations mixed with Japanese

ENHANCEMENT RULES:
1. PRESERVE English text that is intentionally part of the article's content
2. REMOVE only English text that is clearly website UI or navigation
3. Fix incomplete sentences
4. Ensure proper Japanese grammar
5. Maintain the original meaning and information
6. Keep the educational value for Japanese learners
7. If English appears to be a translation note, integrate it properly or remove it
8. Preserve the article structure (introduction, body, conclusion)
9. Do not add information not present in the original
10. Fix any obvious errors or typos

Return ONLY the cleaned Japanese text, nothing else.`;

      try {
        const enhanceCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: enhanceSystemPrompt },
            { role: "user", content: `Clean and enhance this article:\n\n${content}` }
          ],
          temperature: 0.3,
          max_tokens: 4000
        });

        enhancedContent = enhanceCompletion.choices[0].message.content;
        
        // Re-validate the enhanced content
        if (enhancedContent && enhancedContent.length > content.length * 0.5) {
          validationResult.enhancedContent = enhancedContent;
          validationResult.qualityScore = Math.min(validationResult.qualityScore + 20, 85);

        }
      } catch (enhanceError) {
        console.error('Error enhancing content:', enhanceError);
        // Continue without enhancement
      }
    }

    // Step 3: Generate image search keywords if quality is acceptable
    if (validationResult.qualityScore >= 60 && (!validationResult.imageKeywords || validationResult.imageKeywords.length === 0)) {
      validationResult.imageKeywords = ['Japan', 'Japanese culture', 'study']; // Fallback keywords
    }

    return NextResponse.json({
      qualityScore: validationResult.qualityScore || 0,
      jlptLevel: validationResult.jlptLevel || 'Unknown',
      issues: validationResult.issues || [],
      suggestions: validationResult.suggestions || [],
      enhancedContent: validationResult.enhancedContent,
      canBeAutoFixed: validationResult.canBeAutoFixed || false,
      imageKeywords: validationResult.imageKeywords || [],
      contentStructure: validationResult.contentStructure || {
        hasProperIntroduction: false,
        hasProperBody: false,
        hasProperConclusion: false,
        isComplete: false
      }
    });

  } catch (error: any) {
    console.error('Article validation error:', error);
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to validate article' },
      { status: 500 }
    );
  }
}