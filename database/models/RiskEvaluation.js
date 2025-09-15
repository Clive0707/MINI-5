const mongoose = require('mongoose');

const riskEvaluationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  risk_category: { type: String, required: true },
  risk_score: { type: Number, required: true },
  factors: { type: [String], default: [] },
  recommendations: { type: [String], default: [] },
  evaluated_at: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

module.exports = mongoose.model('RiskEvaluation', riskEvaluationSchema);

