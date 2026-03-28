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
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!genAI) {
      return res.json({
        reply: 'AI assistant is not configured. Please set GEMINI_API_KEY in the backend environment to enable this feature.'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-mini' });
    const prompt = `You are a helpful cognitive health assistant. Respond concisely and empathetically. User question: "${message.trim()}"`;

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
