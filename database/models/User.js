const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  family_history: { type: String, default: '' },
  medical_conditions: { type: String, default: '' },
  // Baseline calibration (first-time cognitive proficiency)
  baselineScores: { type: mongoose.Schema.Types.Mixed, default: {} },
  baselineCompleted: { type: Boolean, default: false },
  baselineDate: { type: Date, default: null },
  // Reminder configuration
  reminderEnabled: { type: Boolean, default: false },
  reminderTime: { type: String, default: '' }, // HH:mm
  lastReminderSentAt: { type: Date, default: null },
  // Optional language preference (frontend uses localStorage as primary)
  preferredLanguage: { type: String, default: 'en' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);

