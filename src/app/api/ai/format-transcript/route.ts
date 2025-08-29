import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TranscriptLine } from '@/app/tools/youtube-shadowing/YouTubeShadowing';
import { TranscriptCacheManager } from '@/utils/transcriptCache';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPEN_AI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { contentId, transcript, videoTitle, language = 'ja' } = await request.json();

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Valid transcript array is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 [AI FORMAT] Starting formatting for ${transcript.length} segments`);

    // Don't format very short transcripts
    if (transcript.length < 3) {
      console.log('📊 [AI FORMAT] Transcript too short, skipping formatting');
      return NextResponse.json({ 
        formattedTranscript: transcript,
        wasFormatted: false,
        success: true 
      });
    }

    // STEP 1: Combine all transcript segments into continuous text
    // This is crucial - we need to see the full context to split properly
    const fullText = transcript.map(line => line.text).join('');
    const totalDuration = transcript[transcript.length - 1].endTime - transcript[0].startTime;
    
    console.log(`📊 [AI FORMAT] Combined text length: ${fullText.length} characters`);

    const systemPrompt = `You are an expert Japanese language educator specializing in shadowing practice.
Your task is to split Japanese text into SHORT segments ideal for shadowing practice.

CRITICAL RULES:
1. MAXIMUM 20 characters per segment (HARD LIMIT - this is essential for shadowing)
2. NEVER split です/ます/でした/ました/だ/だった from their stems
3. NEVER split particles from preceding words
4. Aim for 8-15 characters ideally (2-3 seconds of speech)

BREAKING LONG SENTENCES:
For sentences over 20 characters, break at these natural points:
- After て-form: して、見て、食べて、行って
- After connectors: から、けど、が、のに、ので、し
- Between clauses (before new subjects)
- After time/place markers if the rest is too long

EXAMPLES:
"昨日友達と一緒に映画を見てとても楽しかったです" (35 chars - TOO LONG!)
Split as: ["昨日友達と一緒に", "映画を見て", "とても楽しかったです"]

"これはとても難しい問題だと思いますがやってみます" (24 chars - TOO LONG!)  
Split as: ["これはとても難しい", "問題だと思いますが", "やってみます"]

"私は毎朝六時に起きて朝ごはんを食べてから学校に行きます" (28 chars - TOO LONG!)
Split as: ["私は毎朝六時に起きて", "朝ごはんを食べてから", "学校に行きます"]

OUTPUT FORMAT:
Return a JSON object with a "segments" array.
Each segment must be under 20 characters for comfortable shadowing repetition.`;

    const userPrompt = `Split this continuous Japanese text into segments for shadowing practice.
The text has NO punctuation, so you must identify natural break points based on grammar.

Text: ${fullText}

Remember:
- MAXIMUM 20 characters per segment (break longer sentences at natural points)
- NEVER break です/ます/だ from their stems
- For long sentences, break after て-form or connectors like から/けど/が
- Each segment should be easy to repeat (2-3 seconds when spoken)`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2, // Lower temperature for more consistent splitting
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message.content || '{"segments": []}');
      const aiSegments = response.segments || [];

      if (aiSegments.length === 0) {
        console.log('⚠️ [AI FORMAT] No segments returned by AI');
        return NextResponse.json({ 
          formattedTranscript: transcript,
          wasFormatted: false,
          success: false 
        });
      }

      console.log(`✅ [AI FORMAT] AI split text into ${aiSegments.length} segments`);

      // STEP 2: Map AI segments back to ORIGINAL timestamps
      // Find where each AI segment actually appears in the original text
      // and use those exact timestamps (or interpolate only when necessary)
      const formattedTranscript: TranscriptLine[] = [];
      
      // Now map each AI segment to its actual timestamp
      let currentCharPos = 0;
      
      aiSegments.forEach((segmentText: string, index: number) => {
        // Find where this segment starts in the original text
        const segmentStartPos = fullText.indexOf(segmentText, currentCharPos);
        
        if (segmentStartPos === -1) {
          console.warn(`⚠️ [AI FORMAT] Could not find segment in original: "${segmentText.substring(0, 20)}..."`);
          return;
        }
        
        const segmentEndPos = segmentStartPos + segmentText.length;
        
        // Find which original segments this AI segment spans
        let startTime = transcript[0].startTime;
        let endTime = transcript[0].endTime;
        let foundStart = false;
        let foundEnd = false;
        
        // Find the EXACT original segment where this AI text starts
        let charCounter = 0;
        for (let i = 0; i < transcript.length; i++) {
          const origSegment = transcript[i];
          const segmentStart = charCounter;
          const segmentEnd = charCounter + origSegment.text.length;
          
          // If the AI segment starts within this original segment
          if (!foundStart && segmentStartPos >= segmentStart && segmentStartPos < segmentEnd) {
            // Check if it starts at the beginning of the original segment
            if (segmentStartPos === segmentStart) {
              // Use the exact original timestamp
              startTime = origSegment.startTime;
            } else {
              // It starts mid-segment, so interpolate
              const posInSegment = segmentStartPos - segmentStart;
              const ratio = posInSegment / origSegment.text.length;
              startTime = origSegment.startTime + (origSegment.endTime - origSegment.startTime) * ratio;
            }
            foundStart = true;
          }
          
          // If the AI segment ends within this original segment
          if (!foundEnd && segmentEndPos > segmentStart && segmentEndPos <= segmentEnd) {
            // Check if it ends at the end of the original segment
            if (segmentEndPos === segmentEnd) {
              // Use the exact original timestamp
              endTime = origSegment.endTime;
            } else {
              // It ends mid-segment, so interpolate
              const posInSegment = segmentEndPos - segmentStart;
              const ratio = posInSegment / origSegment.text.length;
              endTime = origSegment.startTime + (origSegment.endTime - origSegment.startTime) * ratio;
            }
            foundEnd = true;
          }
          
          if (foundStart && foundEnd) break;
          charCounter += origSegment.text.length;
        }
        
        formattedTranscript.push({
          id: `formatted_${index + 1}`,
          text: segmentText,
          startTime: startTime,
          endTime: endTime,
          words: segmentText.split(/[\s、。！？]/g).filter(w => w.length > 0)
        });
        
        currentCharPos = segmentEndPos;
      });

      // Log sample for debugging
      console.log('📋 Sample formatted segments:');
      formattedTranscript.slice(0, 5).forEach((seg, i) => {
        console.log(`  ${i + 1}. [${seg.startTime.toFixed(2)}s - ${seg.endTime.toFixed(2)}s] ${seg.text}`);
      });
      
      // Log original vs formatted comparison
      console.log('🔍 Original vs Formatted timing comparison:');
      console.log(`  Original first segment: [${transcript[0].startTime.toFixed(2)}s] "${transcript[0].text.substring(0, 30)}..."`);
      console.log(`  Formatted first segment: [${formattedTranscript[0]?.startTime.toFixed(2)}s] "${formattedTranscript[0]?.text.substring(0, 30)}..."`);
      console.log(`  Original total segments: ${transcript.length}`);
      console.log(`  Formatted total segments: ${formattedTranscript.length}`);

      // Check for grammar violations
      const violations = formattedTranscript.filter(seg => 
        seg.text.match(/^(です|ます|でした|ました|だ|だった)/) ||
        seg.text.match(/の$|が$|を$|に$|は$/)
      );

      if (violations.length > 0) {
        console.warn(`⚠️ [AI FORMAT] Found ${violations.length} potential grammar violations`);
        violations.slice(0, 3).forEach(v => {
          console.warn(`  - "${v.text}"`);
        });
      }

      // Check for segments that are too long for shadowing
      const longSegments = formattedTranscript.filter(seg => seg.text.length > 20);
      if (longSegments.length > 0) {
        console.warn(`⚠️ [AI FORMAT] Found ${longSegments.length} segments over 20 characters (too long for comfortable shadowing)`);
        longSegments.slice(0, 5).forEach(seg => {
          console.warn(`  - [${seg.text.length} chars] "${seg.text}"`);
        });
      }

      // Log segment length statistics
      const lengths = formattedTranscript.map(seg => seg.text.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const maxLength = Math.max(...lengths);
      const minLength = Math.min(...lengths);
      console.log(`📊 [AI FORMAT] Segment length stats: avg=${avgLength.toFixed(1)}, min=${minLength}, max=${maxLength}`);
      console.log(`📊 [AI FORMAT] Ideal range (8-15 chars): ${lengths.filter(l => l >= 8 && l <= 15).length}/${lengths.length} segments`);

      // Save the formatted transcript to cache if contentId is provided
      if (contentId) {
        try {
          await TranscriptCacheManager.updateWithFormattedTranscript(
            contentId,
            formattedTranscript
          );
          console.log(`✅ [AI FORMAT] Saved formatted transcript to cache for ${contentId}`);
        } catch (cacheError) {
          console.error('Failed to save formatted transcript to cache:', cacheError);
        }
      }

      return NextResponse.json({
        formattedTranscript,
        wasFormatted: true,
        success: true,
        stats: {
          originalLines: transcript.length,
          formattedLines: formattedTranscript.length,
          violations: violations.length,
          longSegments: longSegments.length,
          avgSegmentLength: parseFloat(avgLength.toFixed(1)),
          maxSegmentLength: maxLength,
          idealSegments: lengths.filter(l => l >= 8 && l <= 15).length
        }
      });

    } catch (aiError: any) {
      console.error('AI processing error:', aiError);
      
      if (aiError?.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      // Return original on AI failure
      return NextResponse.json({ 
        formattedTranscript: transcript,
        wasFormatted: false,
        success: false,
        error: 'AI processing failed' 
      });
    }

  } catch (error: any) {
    console.error('Transcript formatting error:', error);
    
    return NextResponse.json(
      { error: 'Failed to format transcript' },
      { status: 500 }
    );
  }
}