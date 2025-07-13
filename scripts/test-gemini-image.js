const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiImage() {
  try {
    if (!process.env.GOOGLE_GEMINI) {
      console.error('GOOGLE_GEMINI environment variable not set');
      return;
    }

    console.log('Testing Gemini image generation...');
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI);
    
    // Try with the flash model that supports image generation
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash'
    });
    
    const prompt = "An adorable illustration of students in a classroom, Japanese anime style";
    
    console.log('Prompt:', prompt);
    console.log('Generating with Gemini...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Response:', text);
    
    // Note: The standard Gemini API doesn't directly generate images
    // It can analyze images but not generate them
    // For image generation, you'd need to use a different approach
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testGeminiImage();