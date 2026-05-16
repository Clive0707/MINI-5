const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  time: {
    type: String, // format: "HH:MM" in 24-hour time
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // allows reminders for non-registered users theoretically
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSentAt: {
    type: Date,
    default: null,
  }
});

module.exports = mongoose.model('Reminder', reminderSchema);
