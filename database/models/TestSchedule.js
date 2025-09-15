const mongoose = require('mongoose');

const testScheduleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  test_type: { type: String, required: true },
  scheduled_date: { type: Date, required: true, index: true },
  scheduled_time: { type: String },
  frequency: { type: String, default: 'weekly' },
  status: { type: String, default: 'scheduled' },
  reminder_sent: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('TestSchedule', testScheduleSchema);

