const http = require('http');
const JWT = require('jsonwebtoken');

// Create test token
const token = JWT.sign({ id: 'test_user' }, 'dementia-tracker-secret-key');
const token2 = JWT.sign({ id: 'test_user' }, 'dementia-tracker-dev-secret-key');

for (const tk of [token, token2]) {
  const data = JSON.stringify({ message: 'Hello' });
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + tk,
      'Content-Length': Buffer.byteLength(data)
    }
  }, res => {
    let body = '';
    res.on('data', chunk => body += chunk.toString());
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
  });

  req.on('error', e => console.error('Req error:', e));
  req.write(data);
  req.end();
}
