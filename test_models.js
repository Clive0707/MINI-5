require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.5-flash-latest'];
  for (const model of models) {
    try {
      const gModel = genAI.getGenerativeModel({ model });
      const response = await gModel.generateContent('Hi');
      console.log('✅ Success with', model);
    } catch (err) {
      console.error(`❌ Error with ${model}:`, err.message);
    }
  }
}

test();
