/**
 * Debug endpoint to test conjugation classification
 * This helps diagnose production vs development discrepancies
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchWords } from '@/utils/api';
import { ConjugationEngine } from '@/utils/conjugation';

export async function POST(request: NextRequest) {
  try {
    const { word, testConjugation } = await request.json();
    
    if (!word) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }
    
    // Search for the word using the main API
    const searchResults = await searchWords(word, 5);
    
    // Prepare debug information
    const debugInfo = {
      searchTerm: word,
      environment: process.env.NODE_ENV,
      hasWanikaniToken: !!process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN,
      timestamp: new Date().toISOString(),
      results: searchResults.map(result => ({
        word: result.kanji || result.kana,
        kana: result.kana,
        type: result.type,
        meaning: result.meaning,
        // Test conjugation if requested
        conjugations: testConjugation ? (() => {
          try {
            const forms = ConjugationEngine.conjugate(result);
            return {
              success: true,
              sampleForms: {
                present: forms.present,
                past: forms.past,
                negative: forms.negative,
                polite: forms.polite,
                teForm: forms.teForm
              },
              totalNonEmpty: Object.values(forms).filter(v => v && v !== '').length
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })() : undefined
      }))
    };
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug conjugation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug conjugation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if the debug API is working
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Debug conjugation API is ready. Send a POST request with { word: "your-word", testConjugation: true }',
    example: {
      word: '食べる',
      testConjugation: true
    }
  });
}