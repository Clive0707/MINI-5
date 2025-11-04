# 🔧 Gemini API Setup Guide

## Problem: "AI service not configured" Error

If you're seeing the error **"AI service not configured"** when clicking "Start Story Test", it means the Gemini API key is not properly set up.

## ✅ Solution Steps

### Step 1: Create/Edit `.env` File

1. Navigate to the `MINI-5` folder (root of your project)
2. Create a file named `.env` if it doesn't exist, or open it if it does
3. Add the following line:

```env
GEMINI_API_KEY=your-actual-api-key-here
```

**Important:** Replace `your-actual-api-key-here` with your actual Gemini API key.

### Step 2: Get Your Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy the generated API key
5. Paste it in your `.env` file

**Example `.env` file:**
```env
PORT=5000
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/dementia-tracker
GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Verify `.env` File Location

Make sure your `.env` file is in the **root** of the `MINI-5` folder:

```
MINI-5/
├── .env          ← Must be here!
├── server.js
├── package.json
├── routes/
│   └── dementia.js
└── ...
```

### Step 4: Restart Your Backend Server

**⚠️ CRITICAL:** After adding or updating the `.env` file, you MUST restart your backend server:

1. **Stop the server** (Press `Ctrl+C` in the terminal where it's running)
2. **Start it again:**
   ```bash
   npm start
   # or
   npm run dev
   ```

### Step 5: Check Server Console

When the server starts, you should see one of these messages:

✅ **Success:**
```
✅ Gemini AI initialized successfully
```

⚠️ **Warning (Key Missing):**
```
⚠️  GEMINI_API_KEY not found in environment variables. Story Recall feature will not work.
```

❌ **Error (Invalid Key):**
```
❌ Failed to initialize Gemini AI: [error message]
```

## 🔍 Verify Setup

### Option 1: Check via API Endpoint

Once logged in, you can check if the API is configured by visiting:
```
http://localhost:5000/api/dementia/health
```

You should see a JSON response like:
```json
{
  "configured": true,
  "hasApiKey": true,
  "isInitialized": true,
  "message": "Gemini API is properly configured"
}
```

### Option 2: Test the Feature

1. Log into the application
2. Go to Dashboard
3. Click "Start Story Test"
4. If configured correctly, it should start generating a story
5. If not, you'll still see "AI service not configured"

## 🐛 Troubleshooting

### Issue: Still getting "AI service not configured" after adding key

**Solutions:**
1. ✅ Verify `.env` file is in the correct location (`MINI-5/.env`)
2. ✅ Check that the key doesn't have quotes around it: `GEMINI_API_KEY=AIza...` (not `GEMINI_API_KEY="AIza..."`)
3. ✅ Ensure there are no spaces: `GEMINI_API_KEY=AIza...` (not `GEMINI_API_KEY = AIza...`)
4. ✅ Restart the backend server after adding the key
5. ✅ Check the server console for initialization messages
6. ✅ Verify the API key is valid by testing it at https://makersuite.google.com/app/apikey

### Issue: Server console shows warning about missing key

**Solution:**
- The `.env` file is not being read. Check:
  - File is named exactly `.env` (not `.env.txt` or `env`)
  - File is in the `MINI-5` folder (same folder as `server.js`)
  - No syntax errors in `.env` file
  - Restart the server

### Issue: "Failed to initialize Gemini AI" error

**Solutions:**
1. Check if the API key is valid
2. Verify you have internet connection
3. Check if there are any API quota limits
4. Try generating a new API key from Google

## 📝 Notes

- The `.env` file should **never** be committed to git (it's in `.gitignore`)
- Each developer needs their own API key
- API keys are free but have usage limits
- The server must be restarted after any `.env` changes

## 🆘 Still Having Issues?

1. Check the backend server console for error messages
2. Verify the `.env` file syntax is correct
3. Try creating a new API key from Google
4. Ensure you're editing the `.env` file in the correct location

