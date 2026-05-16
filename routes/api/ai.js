const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const JWT = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dementia-tracker-secret-key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  JWT.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

let genAI = null;
function initGemini() {
  if (process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('✅ Gemini AI initialized for /api/ai');
    } catch (err) {
      console.error('❌ Failed to initialize Gemini AI for /api/ai:', err.message);
      genAI = null;
    }
  } else {
    console.warn('⚠️ GEMINI_API_KEY not found. /api/ai/chat will return fallback responses.');
  }
}

initGemini();

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, patientData, history } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!genAI) {
      return res.json({
        reply: 'AI assistant is not configured. Please set GEMINI_API_KEY in the backend environment to enable this feature.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const pt = patientData || {};
    const name = pt.name || 'Unknown User';
    const age = pt.age || 'Unknown';
    const completedTests = Array.isArray(pt.completedTests) ? pt.completedTests.join(', ') : (pt.completedTests || 'None');
    const testScores = pt.testScores ? JSON.stringify(pt.testScores) : 'None';
    const symptoms = Array.isArray(pt.symptoms) ? pt.symptoms.join(', ') : (pt.symptoms || 'None');
    const historySummary = pt.historySummary || 'No recent activity or history provided';

    let prompt = `You are a supportive AI assistant for dementia and cognitive health tracking.

Patient Information:
- Name: ${name}
- Age: ${age}
- Completed Tests: ${completedTests}
- Test Scores: ${testScores}
- Symptoms: ${symptoms}
- History: ${historySummary}

Your Responsibilities:
- Ask relevant follow-up questions
- Suggest missing tests (e.g. if general cognitive tests are missing or unmentioned, gently suggest exploring them)
- Detect gaps in tracking (if recent activity is low, suggest retesting)
- Detect low scores and respond gently, suggesting monitoring
- Explain results in simple terms
- Provide emotional reassurance
- Never give medical diagnosis
- Always recommend consulting a doctor when needed
- Ensure every response discussing health includes the soft disclaimer: "This is not a medical diagnosis. Please consult a healthcare professional."
- CRITICAL FORMATTING: Keep all responses concise, maximum 7-8 lines total. Use point-wise formatting (bullet points) when necessary to keep information dense and readable.

Conversation History:
`;

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        const role = msg.role || (msg.from === 'user' ? 'user' : 'assistant');
        const content = msg.content || msg.text || '';
        prompt += `${role.toUpperCase()}: ${content}\n`;
      });
    } else {
      prompt += "None.\n";
    }

    prompt += `\nUSER: ${message.trim()}\nASSISTANT:`;

    const response = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const text = await response.response.text();
    const cleanText = text.trim();

    return res.json({ reply: cleanText });
  } catch (error) {
    console.error('❌ /api/ai/chat error:', error);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

module.exports = router;
