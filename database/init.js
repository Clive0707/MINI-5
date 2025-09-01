const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'dementia_tracker.db');
let db = null;

function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath);
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT NOT NULL,
          family_history TEXT,
          medical_conditions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Cognitive tests table
      db.run(`
        CREATE TABLE IF NOT EXISTS cognitive_tests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          test_type TEXT NOT NULL,
          score REAL NOT NULL,
          max_score REAL NOT NULL,
          time_taken INTEGER,
          test_data TEXT,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Risk evaluations table
      db.run(`
        CREATE TABLE IF NOT EXISTS risk_evaluations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          risk_category TEXT NOT NULL,
          risk_score REAL NOT NULL,
          factors TEXT,
          recommendations TEXT,
          evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_cognitive_tests_user_id ON cognitive_tests(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_cognitive_tests_completed_at ON cognitive_tests(completed_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_risk_evaluations_user_id ON risk_evaluations(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_test_schedules_user_id ON test_schedules(user_id)`);

      // Insert default admin user for testing
      const adminPassword = bcrypt.hashSync('admin123', 10);
      db.run(`
        INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, age, gender, family_history, medical_conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'admin@dementiatracker.com',
        adminPassword,
        'Admin',
        'User',
        35,
        'Other',
        'None',
        'None'
      ], function(err) {
        if (err) {
          console.log('Admin user already exists or error occurred');
        } else {
          console.log('✅ Default admin user created');
        }
      });

      resolve();
    });
  });
}

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath);
  }
  return db;
}

// Don't close the database connection - keep it open for the server
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
