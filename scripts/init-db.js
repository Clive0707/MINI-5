const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const dbPath = path.join(__dirname, '..', 'database', 'dementia_tracker.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Create tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      family_history TEXT,
      medical_conditions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating users table:', err.message);
    } else {
      console.log('✅ Users table created');
    }
  });

  // Cognitive tests table
  db.run(`
    CREATE TABLE IF NOT EXISTS cognitive_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      test_type TEXT NOT NULL,
      score REAL NOT NULL,
      max_score INTEGER DEFAULT 10,
      time_taken INTEGER,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating cognitive_tests table:', err.message);
    } else {
      console.log('✅ Cognitive tests table created');
    }
  });

  // Risk evaluations table
  db.run(`
    CREATE TABLE IF NOT EXISTS risk_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      risk_category TEXT NOT NULL,
      risk_score REAL,
      factors TEXT,
      recommendations TEXT,
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating risk_evaluations table:', err.message);
    } else {
      console.log('✅ Risk evaluations table created');
    }
  });

  // Test schedules table
  db.run(`
    CREATE TABLE IF NOT EXISTS test_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      test_type TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT,
      frequency TEXT DEFAULT 'weekly',
      status TEXT DEFAULT 'scheduled',
      reminder_sent INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating test_schedules table:', err.message);
    } else {
      console.log('✅ Test schedules table created');
    }
  });

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_cognitive_tests_user_id ON cognitive_tests(user_id)`, (err) => {
    if (err) {
      console.error('❌ Error creating index on cognitive_tests:', err.message);
    } else {
      console.log('✅ Index created on cognitive_tests.user_id');
    }
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_risk_evaluations_user_id ON risk_evaluations(user_id)`, (err) => {
    if (err) {
      console.error('❌ Error creating index on risk_evaluations:', err.message);
    } else {
      console.log('✅ Index created on risk_evaluations.user_id');
    }
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_test_schedules_user_id ON test_schedules(user_id)`, (err) => {
    if (err) {
      console.error('❌ Error creating index on test_schedules:', err.message);
    } else {
      console.log('✅ Index created on test_schedules.user_id');
    }
  });
});

// Close database connection
db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err.message);
  } else {
    console.log('✅ Database connection closed');
    console.log('🎉 Database initialization completed successfully!');
  }
});
