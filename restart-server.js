#!/usr/bin/env node

// Wrapper script that kills port 5000 before starting nodemon
const { exec } = require('child_process');
const { spawn } = require('child_process');

// Kill port 5000 first
console.log('🔍 Checking for processes on port 5000...');
exec('npx kill-port 5000', (error) => {
  if (error) {
    console.log('⚠️  No process found on port 5000 (or kill-port failed)');
  } else {
    console.log('✅ Port 5000 cleared');
  }
  
  // Wait a moment, then start nodemon
  setTimeout(() => {
    console.log('🚀 Starting nodemon...');
    const nodemon = spawn('npx', ['nodemon', 'server.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    nodemon.on('exit', (code) => {
      process.exit(code);
    });
  }, 500);
});

