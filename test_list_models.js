require('dotenv').config();
const https = require('https');

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const names = (parsed.models || []).map(m => m.name);
      console.log('Available Models:', names.join(', '));
    } catch (e) { console.error('Error parsing:', body); }
  });
}).on('error', e => console.error(e.message));
