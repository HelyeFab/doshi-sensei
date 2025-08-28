import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { kanji, meaning, readings } = await request.json();

    if (!kanji) {
      return NextResponse.json(
        { error: 'Kanji character is required' },
        { status: 400 }
      );
    }

    const openAiApiKey = process.env.OPEN_AI_API_KEY;
    if (!openAiApiKey) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Create a prompt that will generate mnemonics in the desired format
    const systemPrompt = `You are a Japanese language learning assistant specializing in creating memorable mnemonics for kanji characters. 
Format your responses exactly as specified with emojis and sections.`;

    const userPrompt = `Create a memorable mnemonic for the Japanese kanji ${kanji} (meaning: ${meaning || 'unknown'}, kun readings: ${readings?.kun?.join(', ') || 'unknown'}, on readings: ${readings?.on?.join(', ') || 'unknown'}).

Format your response EXACTLY like this:

🖼 Visual shape
[Describe what the kanji looks like visually, comparing it to familiar objects or shapes. Be creative and memorable. 2-3 sentences.]

📖 Story-based mnemonics
[Create 2-3 short, memorable stories that connect the visual elements to the meaning. Make them vivid and easy to remember.]

🔗 Meaning connection
[Explain the meaning and provide 2-3 compound word examples using this kanji, with readings in hiragana.]

🎵 Extra trick (sound clue)
[Create a sound-based memory trick connecting the reading to the meaning or visual.]`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to generate mnemonic' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Extract the generated text from the response
    const generatedText = data.choices?.[0]?.message?.content || '';

    if (!generatedText) {
      console.error('No content in OpenAI response');
      return NextResponse.json(
        { error: 'Failed to generate mnemonic' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      kanji,
      mnemonic: generatedText.trim(),
      source: 'openai',
      model: 'gpt-3.5-turbo',
      meaning,
      readings
    });

  } catch (error) {
    console.error('Error generating mnemonic:', error);
    return NextResponse.json(
      { error: 'Failed to generate mnemonic' },
      { status: 500 }
    );
  }
}