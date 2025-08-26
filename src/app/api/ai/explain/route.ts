import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Server-side only - API key is safe here
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY, // Using your existing env variable
});

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, contextType, surroundingContext, userLevel } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a Japanese language teacher providing clear, concise explanations. 
Format your response as JSON with the following fields:
- meaning: Brief translation/meaning (MUST be a simple string)
- grammar: Grammar points if applicable (MUST be a simple string or null)
- usage: How it's commonly used (MUST be a simple string or null)
- examples: Array of example sentences as simple strings (format: "Japanese - English translation")
- culturalNotes: Any cultural context if relevant (MUST be a simple string or null)

IMPORTANT: Do NOT return nested objects or complex structures. All values must be simple strings or arrays of strings.
Do NOT return objects like {subject: "...", predicate: "..."} - instead combine into a single descriptive string.

Adjust complexity based on user level: ${userLevel || 'intermediate'}`;

    const userPrompt = `Explain this Japanese ${contextType || 'text'}: "${text}"
${surroundingContext ? `Context: "${surroundingContext}"` : ''}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Ensure all values are strings or arrays of strings, not objects
    const sanitizeValue = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    const sanitizeExamples = (examples: any): string[] => {
      if (!Array.isArray(examples)) return [];
      return examples.map(ex => {
        if (typeof ex === 'string') return ex;
        if (typeof ex === 'object' && ex.japanese && ex.english) {
          return `${ex.japanese} - ${ex.english}`;
        }
        return String(ex);
      });
    };
    
    return NextResponse.json({
      explanation: {
        meaning: sanitizeValue(response.meaning) || '',
        grammar: sanitizeValue(response.grammar),
        usage: sanitizeValue(response.usage),
        examples: sanitizeExamples(response.examples),
        culturalNotes: sanitizeValue(response.culturalNotes)
      }
    });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    if (error?.status === 402) {
      return NextResponse.json(
        { error: 'OpenAI quota exceeded' },
        { status: 402 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get explanation' },
      { status: 500 }
    );
  }
}