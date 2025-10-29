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

// Gemini init
let genAI = null
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

const FAST_CONFIG = { temperature: 0.7, topK: 20, topP: 0.8, maxOutputTokens: 512, candidateCount: 1 }
const EVAL_CONFIG = { temperature: 0.3, topK: 10, topP: 0.7, maxOutputTokens: 256, candidateCount: 1 }
const callAIWithTimeout = async (promise, ms = 50000) => Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error('AI_TIMEOUT')), ms))])

// In-memory sessions: dementia story recall
const dementiaSessions = new Map()

// POST /api/dementia/start
router.post('/start', authenticateToken, async (req, res) => {
  try {
    if (!genAI) return res.status(500).json({ error: 'AI service not configured' })

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: FAST_CONFIG })
    const prompt = `You are running a cognitive assessment focusing on story recall.
Create JSON with a 10-sentence coherent story (plain text, no numbers) and 5-7 concise recall questions about key details.
Return strictly JSON with keys: storyText (string), recallQuestions (array of strings).`

    const result = await callAIWithTimeout(
      model.generateContent({ contents: [{ parts: [{ text: prompt }] }] })
    )
    const txt = await result.response.text()
    const jsonMatch = txt.match(/\{[\s\S]*\}/)
    let storyObj
    try {
      storyObj = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (_) {
      storyObj = null
    }
    if (!storyObj || !storyObj.storyText || !Array.isArray(storyObj.recallQuestions)) {
      // minimal fallback
      storyObj = {
        storyText: 'Emma visited her grandfather every Sunday. He loved telling stories about his garden... (continue to 10 sentences).',
        recallQuestions: [
          'Who did Emma visit?',
          'How often did she visit?',
          'What did her grandfather love talking about?'
        ]
      }
    }

    const sessionId = `${req.user.userId}-${Date.now()}`
    dementiaSessions.set(sessionId, {
      sessionId,
      userId: req.user.userId,
      storyText: storyObj.storyText,
      recallQuestions: storyObj.recallQuestions,
      answers: [],
      scores: [],
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

// POST /api/dementia/answer
router.post('/answer', authenticateToken, async (req, res) => {
  try {
    const { sessionId, question, answer } = req.body || {}
    const session = dementiaSessions.get(sessionId)
    if (!session || session.userId !== req.user.userId) return res.status(404).json({ error: 'Session not found' })
    if (!question || typeof answer !== 'string') return res.status(400).json({ error: 'question and answer are required' })
    if (!genAI) return res.status(500).json({ error: 'AI service not configured' })

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: EVAL_CONFIG })
    const evalPrompt = `Evaluate a patient's recall answer based on a narrated story.
Return strictly JSON with keys: score (0-10), accuracy (high|medium|low), comprehension (good|moderate|poor), memoryRetention (strong|moderate|weak), communication (clear|unclear), feedback (string).

Story:\n${session.storyText}\n\nQuestion:\n${question}\n\nAnswer:\n${answer}`

    let evaluation
    try {
      const r = await callAIWithTimeout(model.generateContent({ contents: [{ parts: [{ text: evalPrompt }] }] }))
      const t = await r.response.text()
      const m = t.match(/\{[\s\S]*\}/)
      evaluation = m ? JSON.parse(m[0]) : null
    } catch (_) {
      evaluation = null
    }
    if (!evaluation || typeof evaluation.score !== 'number') {
      evaluation = {
        score: 7,
        accuracy: 'medium',
        comprehension: 'good',
        memoryRetention: 'moderate',
        communication: 'clear',
        feedback: 'Reasonable recall with some omissions.'
      }
    }

    session.answers.push({ question, answer, evaluation, timestamp: new Date() })
    session.scores.push(Number(evaluation.score) || 0)
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

    const avg = session.scores.length ? session.scores.reduce((a, b) => a + b, 0) / session.scores.length : 0
    const summary = {
      averageScore: Number(avg.toFixed(2)),
      totalAnswers: session.answers.length,
      categories: session.answers.reduce((acc, a) => {
        const e = a.evaluation || {}
        acc.accuracy = acc.accuracy || { high: 0, medium: 0, low: 0 }
        acc.comprehension = acc.comprehension || { good: 0, moderate: 0, poor: 0 }
        acc.memoryRetention = acc.memoryRetention || { strong: 0, moderate: 0, weak: 0 }
        acc.communication = acc.communication || { clear: 0, unclear: 0 }
        if (e.accuracy) acc.accuracy[e.accuracy] = (acc.accuracy[e.accuracy] || 0) + 1
        if (e.comprehension) acc.comprehension[e.comprehension] = (acc.comprehension[e.comprehension] || 0) + 1
        if (e.memoryRetention) acc.memoryRetention[e.memoryRetention] = (acc.memoryRetention[e.memoryRetention] || 0) + 1
        if (e.communication) acc.communication[e.communication] = (acc.communication[e.communication] || 0) + 1
        return acc
      }, {})
    }

    const finalReport = { ...summary, generatedAt: new Date().toISOString() }
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

module.exports = router