# Story Recall Feature Setup Guide

## ✅ What's Been Done

1. **Backend Route**: Created `routes/dementia.js` with all endpoints:
   - `POST /api/dementia/start` - Start story session
   - `POST /api/dementia/answer` - Submit and evaluate answers
   - `POST /api/dementia/upload-recording` - Upload audio/video recordings
   - `GET /api/dementia/generate-report` - Get final assessment report
   - `GET /api/dementia/session/:sessionId` - Get session details

2. **Frontend Component**: Created `frontend/src/pages/StoryRecall.js` with:
   - AI avatar video integration (plays when speaking)
   - Text-to-Speech narration for story and questions
   - Voice recognition for patient answers
   - Text input fallback if voice recognition fails
   - Real-time answer evaluation display
   - Final assessment report visualization

3. **Dependencies Installed**:
   - `@google/generative-ai` - Backend (✅ Installed)
   - All other required packages were already present

4. **Route Mounted**: Backend route is already mounted in `server.js`

## 🔑 What YOU Need to Do

### 1. Add Gemini API Key

Create or edit `.env` file in the `MINI-5` folder and add:

```env
GEMINI_API_KEY=your-actual-api-key-here
```

**How to get your API key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and paste it in your `.env` file

### 2. Add AI Avatar Video

Place your AI avatar video file at:
```
MINI-5/frontend/public/ai-avatar.mp4
```

**Recommended specs:**
- Format: MP4
- Size: Small file (preferably < 5MB)
- Duration: 10-30 seconds (will loop)
- Content: Neutral background, speaking avatar

### 3. Restart Your Server

After adding the API key, restart your Node.js server:
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm start
# Or for development:
npm run dev
```

## 🚀 How It Works

1. **User clicks "Start Story Test"**
   - Backend calls Gemini AI to generate a 10-sentence story + 5-7 recall questions
   - Story is displayed and narrated via Text-to-Speech
   - AI avatar video plays while story is being narrated

2. **Story Narration**
   - Browser's TTS reads the story sentence by sentence
   - Avatar video plays during speech
   - User listens to the complete story

3. **Question Phase**
   - After story, questions are asked one by one via TTS
   - Avatar plays during questions
   - Patient can answer via:
     - **Voice**: Click microphone button, speak answer
     - **Text**: Type answer manually

4. **Answer Evaluation**
   - Each answer is sent to backend
   - Gemini AI evaluates based on story context
   - Returns: score (0-10), accuracy, comprehension, memory retention, communication quality
   - Results displayed immediately

5. **Final Report**
   - After all questions, generates aggregated report
   - Shows average scores and category breakdowns
   - Displays comprehensive assessment summary

## 📍 Access the Feature

Once set up, navigate to:
```
http://localhost:3000/story-recall
```

(The route is already configured in `App.js`)

## 🛠️ Troubleshooting

**Problem**: "AI service not configured"
- **Solution**: Make sure `GEMINI_API_KEY` is in your `.env` file and server is restarted

**Problem**: Video not showing
- **Solution**: Ensure `ai-avatar.mp4` exists in `frontend/public/` folder

**Problem**: Voice recognition not working
- **Solution**: 
  - Check browser permissions for microphone
  - Use HTTPS or localhost (SpeechRecognition requires secure context)
  - Type answers manually using the "Type Instead" button

**Problem**: CORS errors
- **Solution**: Ensure frontend runs on port 3000 and backend on port 5000 (configured in `server.js`)

## 📝 Notes

- All authentication is handled automatically via JWT tokens
- Sessions are stored in-memory (will reset on server restart)
- Recordings are saved to `uploads/dementia-sessions/` folder
- The feature works best in Chrome/Edge (best SpeechRecognition support)

