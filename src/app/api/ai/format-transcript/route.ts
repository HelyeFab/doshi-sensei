import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TranscriptLine } from '@/app/tools/youtube-shadowing/YouTubeShadowing';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

// Helper to interpolate timestamps for split segments
function interpolateTimestamps(
  originalStart: number,
  originalEnd: number,
  segments: string[]
): { startTime: number; endTime: number }[] {
  const duration = originalEnd - originalStart;
  const segmentDuration = duration / segments.length;
  
  return segments.map((_, index) => ({
    startTime: originalStart + (segmentDuration * index),
    endTime: originalStart + (segmentDuration * (index + 1))
  }));
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { transcript, videoTitle, language = 'ja' } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Valid transcript array is required' },
        { status: 400 }
      );
    }

    // Don't format if transcript is already well-segmented
    const avgLineLength = transcript.reduce((sum, line) => sum + line.text.length, 0) / transcript.length;
    console.log('📊 [AI FORMAT] Checking if formatting needed:', {
      avgLineLength,
      transcriptLength: transcript.length,
      skipCondition: avgLineLength < 40 && transcript.length > 10
    });
    
    // For very short transcripts (< 5 lines), always skip formatting
    // For medium length (5-50 lines), format if lines are long
    // For long transcripts (> 50 lines), always try to format
    const shouldFormat = transcript.length < 5 ? false :
                         transcript.length > 50 ? true :
                         avgLineLength > 40;
    
    if (!shouldFormat) {
      console.log('📊 [AI FORMAT] Skipping formatting - transcript already optimal');
      return NextResponse.json({ 
        formattedTranscript: transcript,
        wasFormatted: false 
      });
    }

    // Process in chunks to avoid token limits
    const CHUNK_SIZE = 30; // Process 30 lines at a time to stay under token limits
    const chunks = [];
    for (let i = 0; i < transcript.length; i += CHUNK_SIZE) {
      chunks.push(transcript.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`📊 [AI FORMAT] Splitting ${transcript.length} lines into ${chunks.length} chunks of max ${CHUNK_SIZE} lines`);
    
    const allFormattedSegments: TranscriptLine[] = [];
    let globalNewId = 1;

    const systemPrompt = `You are an expert Japanese language educator specializing in shadowing practice optimization.
Your task is to reformat Japanese transcripts to make them ideal for language learning through shadowing.

CRITICAL RULES:
1. Break long sentences at natural pause points while preserving meaning
2. Keep grammatical units together (don't split particles from their words)
3. Target 15-35 characters per line for optimal shadowing
4. Preserve the natural flow and rhythm of speech
5. Each line should be a complete thought or grammatical unit when possible
6. For songs/poetry, respect the artistic line breaks but still ensure readability
7. NEVER add romaji, romanization, or English translations
8. Output ONLY Japanese text (kanji, hiragana, katakana)
9. Remove any romaji if present in the input

OUTPUT FORMAT:
Return a JSON array where each element has:
- "originalIndex": the [index] of the original line this came from
- "text": the formatted Japanese text ONLY (no romaji, no translations)
- "segments": number of segments this was split into (1 if not split)

EXAMPLES:
Input: "まだこの世界は mada kono sekai wa 僕を飼いならしてたいみたいだ"
Output: [
  {"originalIndex": 0, "text": "まだこの世界は", "segments": 2},
  {"originalIndex": 0, "text": "僕を飼いならしてたいみたいだ", "segments": 2}
]

IMPORTANT: Output must contain ONLY Japanese characters. Remove all romaji and English.`;

    // Process each chunk separately
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      const chunkStartIdx = chunkIdx * CHUNK_SIZE;
      
      console.log(`📊 [AI FORMAT] Processing chunk ${chunkIdx + 1}/${chunks.length} (lines ${chunkStartIdx} to ${chunkStartIdx + chunk.length - 1})`);
      
      // Prepare chunk transcript for GPT-4
      const chunkText = chunk.map((line, idx) => 
        `[${chunkStartIdx + idx}] ${line.text}`
      ).join('\n');

      const userPrompt = `Format this Japanese transcript for optimal shadowing practice:

${videoTitle && chunkIdx === 0 ? `Video Title: ${videoTitle}\n` : ''}
Transcript (part ${chunkIdx + 1}/${chunks.length}):
${chunkText}

Break up any long run-on sentences into natural, meaningful segments that are easy to shadow.`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000, // Reduced to ensure we don't hit limits
          response_format: { type: "json_object" }
        });

        const response = JSON.parse(completion.choices[0].message.content || '{"segments": []}');
        
        // Group segments by original index for timestamp interpolation
        const segmentsByOriginal = new Map<number, any[]>();
        
        (response.segments || response).forEach((segment: any) => {
          const origIdx = segment.originalIndex;
          if (!segmentsByOriginal.has(origIdx)) {
            segmentsByOriginal.set(origIdx, []);
          }
          segmentsByOriginal.get(origIdx)!.push(segment);
        });
        
        // Create formatted transcript with interpolated timestamps for this chunk
        segmentsByOriginal.forEach((segments, origIdx) => {
          if (origIdx >= 0 && origIdx < transcript.length) {
            const original = transcript[origIdx];
            const timestamps = interpolateTimestamps(
              original.startTime,
              original.endTime,
              segments.map(s => s.text)
            );
            
            segments.forEach((segment, idx) => {
              allFormattedSegments.push({
                id: `formatted_${globalNewId++}`,
                text: segment.text,
                startTime: timestamps[idx].startTime,
                endTime: timestamps[idx].endTime,
                words: segment.text.split(/[\s、。！？]/g).filter(w => w.length > 0)
              });
            });
          }
        });
      } catch (chunkError: any) {
        console.error(`Error processing chunk ${chunkIdx + 1}:`, chunkError);
        // If a chunk fails, add the original lines as fallback
        chunk.forEach((line) => {
          allFormattedSegments.push({
            id: `formatted_${globalNewId++}`,
            text: line.text,
            startTime: line.startTime,
            endTime: line.endTime,
            words: line.words || line.text.split(/[\s、。！？]/g).filter(w => w.length > 0)
          });
        });
      }
    }
    
    // If formatting failed or produced no results, return original
    if (allFormattedSegments.length === 0) {
      console.log('AI formatting produced no results, returning original');
      return NextResponse.json({ 
        formattedTranscript: transcript,
        wasFormatted: false 
      });
    }
    
    console.log(`📊 [AI FORMAT] Complete: ${transcript.length} lines -> ${allFormattedSegments.length} lines`);
    
    return NextResponse.json({
      formattedTranscript: allFormattedSegments,
      wasFormatted: true,
      stats: {
        originalLines: transcript.length,
        formattedLines: allFormattedSegments.length,
        avgOriginalLength: Math.round(transcript.reduce((sum, line) => sum + line.text.length, 0) / transcript.length),
        avgFormattedLength: Math.round(allFormattedSegments.reduce((sum, line) => sum + line.text.length, 0) / allFormattedSegments.length)
      }
    });

  } catch (error: any) {
    console.error('Transcript formatting error:', error);
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to format transcript' },
      { status: 500 }
    );
  }
}