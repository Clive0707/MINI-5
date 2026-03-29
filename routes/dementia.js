const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const router = express.Router()

// Local copy of authenticateToken (mirrors server.js)
const JWT = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'dementia-tracker-secret-key'
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Access token required' })
  JWT.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' })
    req.user = user
    next()
  })
}

// Multer setup for dementia recordings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/dementia-sessions'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) return cb(null, true)
    cb(new Error('Only audio/video files are allowed'))
  }
})

// Gemini init - check on module load and also provide a function to re-check
let genAI = null
function initializeGemini() {
  if (process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      console.log('✅ Gemini AI initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error.message)
      genAI = null
    }
  } else {
    console.warn('⚠️  GEMINI_API_KEY not found in environment variables. Story Recall will use pre-defined story.')
    genAI = null
  }
}
// Initialize on module load
initializeGemini()

const FAST_CONFIG = { temperature: 0.7, topK: 20, topP: 0.8, maxOutputTokens: 512, candidateCount: 1 }
const EVAL_CONFIG = { temperature: 0.3, topK: 10, topP: 0.7, maxOutputTokens: 256, candidateCount: 1 }
const callAIWithTimeout = async (promise, ms = 50000) => Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error('AI_TIMEOUT')), ms))])

// Pre-defined story for fallback (when Gemini API is not available)
const PREDEFINED_STORY = {
  storyText: `Anna woke up early on Saturday morning to visit her grandmother at the nursing home. She packed a basket with fresh apples from the farmer's market and a warm blueberry pie she had baked the night before. The drive took about forty minutes through the countryside, passing fields of golden wheat and grazing cows. When she arrived, her grandmother was sitting in the garden, reading a book about birds. They spent the afternoon talking about family memories, looking at old photographs, and feeding the colorful birds that visited the garden. Before leaving, Anna helped her grandmother plant new rose bushes near the wooden bench. Her grandmother thanked her with tears of joy and promised to take care of the roses. Anna felt happy knowing she had brought sunshine to her grandmother's day.`,
  recallQuestions: [
    'Who did Anna visit?',
    'What day of the week did Anna visit?',
    'What did Anna bring in the basket?',
    'How long did the drive take?',
    'Where was Anna\'s grandmother when she arrived?',
    'What was her grandmother reading about?',
    'What did they plant together?'
  ],
  // Expected keywords for each question (for keyword matching)
  expectedKeywords: [
    ['grandmother', 'grandma', 'grandmother\'s', 'grandma\'s'], // Question 1: Who did Anna visit?
    ['saturday'], // Question 2: What day of the week did Anna visit?
    ['apple', 'apples', 'pie', 'blueberry', 'basket'], // Question 3: What did Anna bring in the basket?
    ['forty', '40', 'minutes', 'minute'], // Question 4: How long did the drive take?
    ['garden'], // Question 5: Where was Anna's grandmother when she arrived?
    ['bird', 'birds'], // Question 6: What was her grandmother reading about?
    ['rose', 'roses', 'bush', 'bushes'] // Question 7: What did they plant together?
  ]
}

// In-memory sessions: dementia story recall
const dementiaSessions = new Map()

// POST /api/dementia/start
router.post('/start', authenticateToken, async (req, res) => {
  try {
    let storyObj = null

    // Try to use Gemini API if available
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: FAST_CONFIG })
        const prompt = `You are running a cognitive assessment focusing on story recall.
Create JSON with a 10-sentence coherent story (plain text, no numbers) and 5-7 concise recall questions about key details.
Return strictly JSON with keys: storyText (string), recallQuestions (array of strings).`

        const result = await callAIWithTimeout(
          model.generateContent({ contents: [{ parts: [{ text: prompt }] }] })
        )
        const txt = await result.response.text()
        const jsonMatch = txt.match(/\{[\s\S]*\}/)
        try {
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
          if (parsed && parsed.storyText && Array.isArray(parsed.recallQuestions)) {
            storyObj = parsed
            console.log('✅ Using AI-generated story')
          }
        } catch (parseError) {
          console.warn('⚠️  Failed to parse AI response, using pre-defined story')
        }
      } catch (aiError) {
        console.warn('⚠️  AI generation failed, using pre-defined story:', aiError.message)
      }
    }

    // Fallback to pre-defined story if AI is not available or fails
    if (!storyObj) {
      storyObj = PREDEFINED_STORY
      console.log('📖 Using pre-defined story (AI not available or failed)')
    }

    const sessionId = `${req.user.userId}-${Date.now()}`
    dementiaSessions.set(sessionId, {
      sessionId,
      userId: req.user.userId,
      storyText: storyObj.storyText,
      recallQuestions: storyObj.recallQuestions,
      expectedKeywords: storyObj.expectedKeywords || null, // Store expected keywords for evaluation
      answers: [],
      finalReport: null,
      status: 'active',
      startTime: new Date()
    })

    return res.json({ sessionId, storyText: storyObj.storyText, recallQuestions: storyObj.recallQuestions })
  } catch (err) {
    console.error('start error:', err)
    return res.status(500).json({ error: 'Failed to start story recall' })
  }
})

// Simple keyword-based evaluation function (Correct/Wrong)
function evaluateAnswerBasic(question, answer, questionIndex, expectedKeywords) {
  const answerLower = answer.toLowerCase().trim()
  
  // Get expected keywords for this question
  const keywords = expectedKeywords && expectedKeywords[questionIndex] ? expectedKeywords[questionIndex] : []
  
  // Check if any expected keyword is found in the answer
  let isCorrect = false
  if (keywords.length > 0) {
    isCorrect = keywords.some(keyword => answerLower.includes(keyword.toLowerCase()))
  } else {
    // Fallback: if no keywords provided, use basic pattern matching
    const questionLower = question.toLowerCase()
    if (questionLower.includes('who') && (answerLower.includes('grandmother') || answerLower.includes('grandma'))) {
      isCorrect = true
    } else if (questionLower.includes('what day') && answerLower.includes('saturday')) {
      isCorrect = true
    } else if (questionLower.includes('what') && questionLower.includes('basket')) {
      if (answerLower.includes('apple') || answerLower.includes('pie') || answerLower.includes('blueberry')) {
        isCorrect = true
      }
    } else if (questionLower.includes('how long') && (answerLower.includes('forty') || answerLower.includes('40'))) {
      isCorrect = true
    } else if (questionLower.includes('where') && answerLower.includes('garden')) {
      isCorrect = true
    } else if (questionLower.includes('reading') && answerLower.includes('bird')) {
      isCorrect = true
    } else if (questionLower.includes('plant') && (answerLower.includes('rose') || answerLower.includes('bush'))) {
      isCorrect = true
    }
  }
  
  return {
    isCorrect,
    feedback: isCorrect ? 'Correct answer!' : 'Incorrect answer. Please try to recall the story details.'
  }
}

// POST /api/dementia/answer
router.post('/answer', authenticateToken, async (req, res) => {
  try {
    const { sessionId, question, answer, questionIndex } = req.body || {}
    const session = dementiaSessions.get(sessionId)
    if (!session || session.userId !== req.user.userId) return res.status(404).json({ error: 'Session not found' })
    if (!question || typeof answer !== 'string') return res.status(400).json({ error: 'question and answer are required' })

    // Find the question index if not provided
    const qIndex = questionIndex !== undefined ? questionIndex : session.recallQuestions.findIndex(q => q === question)
    
    // Use keyword-based evaluation
    const evaluation = evaluateAnswerBasic(question, answer, qIndex, session.expectedKeywords)

    session.answers.push({ question, answer, evaluation, questionIndex: qIndex, timestamp: new Date() })
    dementiaSessions.set(sessionId, session)
    return res.json({ evaluation })
  } catch (err) {
    console.error('answer error:', err)
    return res.status(500).json({ error: 'Failed to evaluate answer' })
  }
})

// POST /api/dementia/upload-recording
router.post('/upload-recording', authenticateToken, upload.single('recording'), async (req, res) => {
  try {
    const { sessionId } = req.body || {}
    const session = dementiaSessions.get(sessionId)
    if (!session || session.userId !== req.user.userId) return res.status(404).json({ error: 'Session not found' })
    if (!req.file) return res.status(400).json({ error: 'No recording provided' })
    session.recordings = session.recordings || []
    session.recordings.push({ filename: req.file.filename, path: req.file.path, size: req.file.size, uploadedAt: new Date() })
    dementiaSessions.set(sessionId, session)
    return res.json({ message: 'Recording uploaded', filename: req.file.filename })
  } catch (err) {
    console.error('upload error:', err)
    return res.status(500).json({ error: 'Failed to upload recording' })
  }
})

// GET /api/dementia/generate-report
router.get('/generate-report', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.query || {}
    const session = dementiaSessions.get(sessionId)
    if (!session || session.userId !== req.user.userId) return res.status(404).json({ error: 'Session not found' })

    const totalQuestions = session.recallQuestions.length
    // Calculate correct answers from the answers array
    const correctAnswers = session.answers.filter(a => a.evaluation && a.evaluation.isCorrect).length
    const riskFreePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    const summary = {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      riskFreePercentage, // Percentage risk-free-from-dementia score
      generatedAt: new Date().toISOString()
    }

    const finalReport = { ...summary }
    session.finalReport = finalReport
    dementiaSessions.set(sessionId, session)
    return res.json(finalReport)
  } catch (err) {
    console.error('report error:', err)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
})

// GET /api/dementia/session/:sessionId
router.get('/session/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params
  const session = dementiaSessions.get(sessionId)
  if (!session || session.userId !== req.user.userId) return res.status(404).json({ error: 'Session not found' })
  return res.json(session)
})

// GET /api/dementia/health - Check if Gemini API is configured
router.get('/health', authenticateToken, (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY
  const isInitialized = !!genAI
  return res.json({
    configured: hasKey && isInitialized,
    hasApiKey: hasKey,
    isInitialized: isInitialized,
    message: hasKey && isInitialized 
      ? 'Gemini API is properly configured' 
      : hasKey 
        ? 'Gemini API key found but initialization failed' 
        : 'GEMINI_API_KEY not found in environment variables. Please add it to your .env file.'
  })
})

module.exports = router