const mongoose = require('mongoose');

const cognitiveTestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  test_type: { type: String, required: true },
  score: { type: Number, required: true },
  max_score: { type: Number, required: true },
  time_taken: { type: Number },
  test_data: { type: mongoose.Schema.Types.Mixed },
  completed_at: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

module.exports = mongoose.model('CognitiveTest', cognitiveTestSchema);

