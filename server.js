const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jsPDF = require('jspdf');
const { connectMongo } = require('./database/mongo');
const User = require('./database/models/User');
const CognitiveTest = require('./database/models/CognitiveTest');
const RiskEvaluation = require('./database/models/RiskEvaluation');
const TestSchedule = require('./database/models/TestSchedule');
require('dotenv').config();

// Initialize notification service for email notifications
// require('./services/notificationService'); // Temporarily disabled to avoid conflicts

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Error handling for malformed JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log('⚠️ Malformed JSON received, ignoring request');
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Database initialization (MongoDB)

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'dementia-tracker-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ===== AUTH ROUTES =====

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, age, gender, family_history, medical_conditions } = req.body;

    if (!email || !password || !first_name || !last_name || !age || !gender) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (age < 18 || age > 120) {
      return res.status(400).json({ error: 'Age must be between 18 and 120' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = await User.create({
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      age,
      gender,
      family_history: family_history || '',
      medical_conditions: medical_conditions || ''
    });

    const token = jwt.sign(
      { userId: userDoc._id.toString(), email, first_name, last_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: userDoc._id.toString(), email, first_name, last_name, age, gender, family_history, medical_conditions }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt received:', { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('🔍 Querying database for user:', email);
    const user = await User.findOne({ email }).lean();

    if (!user) {
      console.log('❌ Login failed: User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ User found, verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Login failed: Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Password verified, generating token for user:', email);
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, first_name: user.first_name, last_name: user.last_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for user:', email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(), email: user.email, first_name: user.first_name, last_name: user.last_name,
        age: user.age, gender: user.gender, family_history: user.family_history, medical_conditions: user.medical_conditions
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId, 'email first_name last_name age gender family_history medical_conditions created_at').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: { id: user._id.toString(), ...user } });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, age, gender, family_history, medical_conditions } = req.body;

    if (!first_name || !last_name || !age || !gender) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (age < 18 || age > 120) {
      return res.status(400).json({ error: 'Age must be between 18 and 120' });
    }

    const result = await User.findByIdAndUpdate(
      req.user.userId,
      { first_name, last_name, age, gender, family_history: family_history || '', medical_conditions: medical_conditions || '' },
      { new: true }
    ).lean();
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USER ROUTES =====

// Get user dashboard data
app.get('/api/users/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard data for user:', req.user.userId);

    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      console.error('❌ User profile not found for ID:', req.user.userId);
      return res.status(404).json({ error: 'User profile not found' });
    }

    console.log('✅ User profile found:', userProfile.first_name, userProfile.last_name);

    const latestRiskEval = await RiskEvaluation.findOne({ user_id: req.user.userId })
      .select('risk_category risk_score evaluated_at')
      .sort({ evaluated_at: -1 })
      .lean();

    const agg = await CognitiveTest.aggregate([
      { $match: { user_id: new (require('mongoose').Types.ObjectId)(req.user.userId) } },
      { $group: {
          _id: null,
          total_tests: { $sum: 1 },
          average_percentage: { $avg: { $multiply: [{ $divide: ['$score', '$max_score'] }, 100] } },
          last_test_date: { $max: '$completed_at' }
        }
      }
    ]);
    const testStats = agg[0] || { total_tests: 0, average_percentage: 0, last_test_date: null };

    const recentDocs = await CognitiveTest.find({ user_id: req.user.userId })
      .select('test_type score max_score completed_at')
      .sort({ completed_at: -1 })
      .limit(5)
      .lean();
    const recentTests = recentDocs.map(doc => ({
      test_type: doc.test_type,
      percentage: Math.round((doc.score * 100.0) / doc.max_score),
      completed_at: doc.completed_at
    }));

    const today = new Date();
    const nextScheduledTest = await TestSchedule.findOne({
      user_id: req.user.userId,
      status: 'scheduled',
      scheduled_date: { $gte: new Date(today.toDateString()) }
    }).select('test_type scheduled_date').sort({ scheduled_date: 1 }).lean();

    const dashboardData = {
      user_profile: {
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        age: userProfile.age,
        gender: userProfile.gender
      },
      risk_assessment: latestRiskEval ? {
        category: latestRiskEval.risk_category,
        score: latestRiskEval.risk_score,
        date: latestRiskEval.evaluated_at
      } : null,
      test_summary: {
        total_tests: testStats.total_tests || 0,
        average_performance: Math.round(testStats.average_percentage || 0),
        last_test_date: testStats.last_test_date || null
      },
      recent_tests: recentTests,
      next_scheduled_test: nextScheduledTest,
      last_updated: new Date().toISOString()
    };

    console.log('✅ Dashboard data fetched successfully for user:', req.user.userId);
    res.json({ dashboard: dashboardData });
  } catch (error) {
    console.error('❌ Dashboard fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TEST ROUTES =====

// Submit cognitive test result
app.post('/api/tests/submit', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Test submission received:', { 
      test_type: req.body?.test_type, 
      score: req.body?.score, 
      max_score: req.body?.max_score,
      user_id: req.user.userId
    });

    const { test_type, score, max_score, time_taken, test_data } = req.body;

    if (!test_type || score === undefined || !max_score) {
      return res.status(400).json({ error: 'Test type, score, and max score are required' });
    }

    if (score < 0 || score > max_score) {
      return res.status(400).json({ error: 'Invalid score value' });
    }

    const completionDate = new Date().toISOString();
    const percentage = Math.round((score / max_score) * 100);
    const created = await CognitiveTest.create({
      user_id: req.user.userId,
      test_type,
      score,
      max_score,
      time_taken: time_taken || null,
      test_data: test_data || null,
      completed_at: new Date(completionDate)
    });

    console.log('✅ Test result saved successfully:', { test_id: created._id.toString(), user_id: req.user.userId, percentage });

    res.status(201).json({
      message: 'Test result saved successfully',
      test_result: {
        id: created._id.toString(),
        test_type,
        score,
        max_score,
        percentage,
        time_taken: time_taken || null,
        completion_date: completionDate,
        user_id: req.user.userId
      },
      performance_feedback: getPerformanceFeedback(percentage),
      next_steps: getNextSteps(percentage)
    });
  } catch (error) {
    console.error('❌ Test submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== RESULTS ROUTES (Normalized results API) =====

// Save a test result (generic across test types)
app.post('/api/results', authenticateToken, async (req, res) => {
  try {
    const {
      userId, // optional, prefer JWT
      testTypeId, // string identifier (e.g., 'word_recall', 'stroop', 'pattern_recognition')
      score, // normalized 0-10 scale
      performanceLevel, // 'Low' | 'Moderate' | 'High'
      completionDate, // optional ISO string
      metadata, // optional JSON metadata
    } = req.body || {};

    if (!testTypeId || score === undefined || score === null) {
      return res.status(400).json({ error: 'testTypeId and score are required' });
    }

    const normalizedScore = Math.max(0, Math.min(10, Number(score)));
    const maxScore = 10;

    const created = await CognitiveTest.create({
      user_id: userId || req.user.userId,
      test_type: String(testTypeId),
      score: normalizedScore,
      max_score: maxScore,
      time_taken: metadata?.timeTakenSeconds || null,
      test_data: {
        performanceLevel: performanceLevel || null,
        metadata: metadata || null,
      },
      completed_at: completionDate ? new Date(completionDate) : new Date(),
    });

    const percentage = Math.round((created.score / created.max_score) * 100);

    return res.status(201).json({
      result: {
        id: created._id.toString(),
        test_type: created.test_type,
        score: created.score,
        max_score: created.max_score,
        percentage,
        performance_level: created.test_data?.performanceLevel || null,
        time_taken: created.time_taken || null,
        completed_at: created.completed_at,
        metadata: created.test_data?.metadata || null,
      }
    });
  } catch (error) {
    console.error('❌ Save result error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch recent results for current user (or specific user via param if admin later)
app.get('/api/results', authenticateToken, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const docs = await CognitiveTest.find({ user_id: req.user.userId })
      .select('test_type score max_score time_taken completed_at test_data')
      .sort({ completed_at: -1 })
      .limit(limit)
      .lean();

    const results = docs.map(doc => ({
      id: doc._id.toString(),
      test_type: doc.test_type,
      score: doc.score,
      max_score: doc.max_score,
      percentage: Math.round((doc.score / doc.max_score) * 100),
      time_taken: doc.time_taken || null,
      completed_at: doc.completed_at,
      performance_level: doc.test_data?.performanceLevel || null,
      metadata: doc.test_data?.metadata || null,
    }));

    return res.json({ results });
  } catch (error) {
    console.error('❌ Fetch results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== RISK ASSESSMENT ROUTES =====
app.post('/api/risk', authenticateToken, async (req, res) => {
  try {
    const { userId, riskScore, category, contributingFactors, createdAt } = req.body || {};
    if (riskScore === undefined || !category) {
      return res.status(400).json({ error: 'riskScore and category are required' });
    }

    const saved = await RiskEvaluation.create({
      user_id: userId || req.user.userId,
      risk_category: category,
      risk_score: Math.max(0, Math.min(100, Number(riskScore))),
      factors: Array.isArray(contributingFactors?.factors)
        ? contributingFactors.factors
        : ['tests_weight', 'demo_weight'],
      recommendations: contributingFactors?.recommendations || [],
      evaluated_at: createdAt ? new Date(createdAt) : new Date(),
    });

    return res.status(201).json({
      risk: {
        id: saved._id.toString(),
        risk_score: saved.risk_score,
        risk_category: saved.risk_category,
        evaluated_at: saved.evaluated_at,
        contributing_factors: contributingFactors || null,
      }
    });
  } catch (error) {
    console.error('❌ Save risk error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Dashboard alias endpoint to satisfy required route shape
app.get('/api/dashboard/:userId', authenticateToken, async (req, res) => {
  try {
    // Only allow current user for now
    if (req.params.userId && req.params.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Reuse existing dashboard logic via direct aggregation
    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const latestRiskEval = await RiskEvaluation.findOne({ user_id: req.user.userId })
      .select('risk_category risk_score evaluated_at')
      .sort({ evaluated_at: -1 })
      .lean();

    const agg = await CognitiveTest.aggregate([
      { $match: { user_id: new (require('mongoose').Types.ObjectId)(req.user.userId) } },
      { $group: {
          _id: null,
          total_tests: { $sum: 1 },
          average_percentage: { $avg: { $multiply: [{ $divide: ['$score', '$max_score'] }, 100] } },
          last_test_date: { $max: '$completed_at' }
        }
      }
    ]);
    const testStats = agg[0] || { total_tests: 0, average_percentage: 0, last_test_date: null };

    const recentDocs = await CognitiveTest.find({ user_id: req.user.userId })
      .select('test_type score max_score completed_at')
      .sort({ completed_at: -1 })
      .limit(3)
      .lean();
    const recentTests = recentDocs.map(doc => ({
      test_type: doc.test_type,
      percentage: Math.round((doc.score * 100.0) / doc.max_score),
      completed_at: doc.completed_at
    }));

    const dashboardData = {
      user_profile: {
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        age: userProfile.age,
        gender: userProfile.gender
      },
      risk_assessment: latestRiskEval ? {
        category: latestRiskEval.risk_category,
        score: latestRiskEval.risk_score,
        date: latestRiskEval.evaluated_at
      } : null,
      test_summary: {
        total_tests: testStats.total_tests || 0,
        average_performance: Math.round(testStats.average_percentage || 0),
        last_test_date: testStats.last_test_date || null
      },
      recent_tests: recentTests,
      next_scheduled_test: null,
      last_updated: new Date().toISOString()
    };

    return res.json({ dashboard: dashboardData });
  } catch (error) {
    console.error('❌ Dashboard alias error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get performance feedback
function getPerformanceFeedback(percentage) {
  if (percentage >= 90) return { level: 'Excellent', message: 'Outstanding cognitive performance!', color: 'success' };
  if (percentage >= 80) return { level: 'Great', message: 'Strong cognitive abilities demonstrated.', color: 'success' };
  if (percentage >= 70) return { level: 'Good', message: 'Above average performance.', color: 'warning' };
  if (percentage >= 60) return { level: 'Fair', message: 'Average performance with room for improvement.', color: 'warning' };
  if (percentage >= 50) return { level: 'Below Average', message: 'Below average performance. Consider retaking.', color: 'danger' };
  return { level: 'Poor', message: 'Poor performance. Please retake the test.', color: 'danger' };
}

// Helper function to get next steps
function getNextSteps(percentage) {
  if (percentage >= 80) return ['Continue regular testing', 'Maintain healthy lifestyle', 'Consider advanced tests'];
  if (percentage >= 60) return ['Practice similar tests', 'Focus on weak areas', 'Retake in 1-2 weeks'];
  return ['Retake the test', 'Consult healthcare provider', 'Focus on cognitive exercises'];
}

// Get user's test history
app.get('/api/tests/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, test_type } = req.query;
    const filter = { user_id: req.user.userId };
    if (test_type) filter.test_type = test_type;
    const tests = await CognitiveTest.find(filter)
      .select('test_type score max_score time_taken completed_at')
      .sort({ completed_at: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const testsWithMetrics = tests.map(test => ({
      id: test._id.toString(),
      test_type: test.test_type,
      score: test.score,
      max_score: test.max_score,
      time_taken: test.time_taken,
      completed_at: test.completed_at,
      percentage: Math.round((test.score / test.max_score) * 100),
      score_percentage: (test.score / test.max_score) * 100
    }));

    res.json({ tests: testsWithMetrics });
  } catch (error) {
    console.error('Test history fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific test result
app.get('/api/tests/result/:testId', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await CognitiveTest.findOne({ _id: testId, user_id: req.user.userId })
      .select('test_type score max_score time_taken completed_at test_data')
      .lean();

    if (!test) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    const percentage = Math.round((test.score / test.max_score) * 100);
    const performanceFeedback = getPerformanceFeedback(percentage);
    const nextSteps = getNextSteps(percentage);

    res.json({
      test_result: {
        id: test._id.toString(),
        test_type: test.test_type,
        score: test.score,
        max_score: test.max_score,
        time_taken: test.time_taken,
        completed_at: test.completed_at,
        test_data: test.test_data,
        percentage,
        performance_feedback: performanceFeedback,
        next_steps: nextSteps
      }
    });
  } catch (error) {
    console.error('❌ Test result fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== EVALUATION ROUTES =====

// Risk evaluation algorithm
function calculateRiskScore(userProfile, cognitiveScores, lifestyleFactors) {
  let riskScore = 0;
  let factors = [];
  let recommendations = [];

  // Age factor (0-25 points)
  if (userProfile.age >= 65) {
    riskScore += 25;
    factors.push('Age 65+');
    recommendations.push('Regular cognitive monitoring recommended');
  } else if (userProfile.age >= 50) {
    riskScore += 15;
    factors.push('Age 50-64');
    recommendations.push('Consider annual cognitive assessments');
  } else if (userProfile.age >= 35) {
    riskScore += 5;
    factors.push('Age 35-49');
  }

  // Family history factor (0-20 points)
  if (userProfile.family_history && userProfile.family_history.toLowerCase() !== 'none') {
    riskScore += 20;
    factors.push('Family history of dementia');
    recommendations.push('Genetic counseling may be beneficial');
  }

  // Medical conditions factor (0-15 points)
  if (userProfile.medical_conditions && userProfile.medical_conditions.toLowerCase() !== 'none') {
    riskScore += 15;
    factors.push('Existing medical conditions');
    recommendations.push('Regular medical check-ups important');
  }

  // Cognitive test performance factor (0-40 points)
  if (cognitiveScores && cognitiveScores.length > 0) {
    const averageScore = cognitiveScores.reduce((sum, test) => sum + test.percentage, 0) / cognitiveScores.length;
    
    if (averageScore < 60) {
      riskScore += 40;
      factors.push('Low cognitive test scores');
      recommendations.push('Consult healthcare provider for comprehensive evaluation');
    } else if (averageScore < 75) {
      riskScore += 25;
      factors.push('Below average cognitive test scores');
      recommendations.push('Consider more frequent testing and lifestyle modifications');
    } else if (averageScore < 85) {
      riskScore += 15;
      factors.push('Moderate cognitive test scores');
      recommendations.push('Continue monitoring and maintain healthy lifestyle');
    } else {
      riskScore += 5;
      factors.push('Good cognitive test scores');
      recommendations.push('Maintain current healthy habits');
    }
  }

  // Determine risk category
  let riskCategory;
  if (riskScore >= 70) {
    riskCategory = 'High';
    recommendations.push('Schedule appointment with neurologist or geriatrician');
    recommendations.push('Consider brain imaging studies if recommended by doctor');
  } else if (riskScore >= 40) {
    riskCategory = 'Moderate';
    recommendations.push('Regular monitoring every 3-6 months');
    recommendations.push('Focus on lifestyle modifications');
  } else {
    riskCategory = 'Low';
    recommendations.push('Continue healthy lifestyle habits');
    recommendations.push('Annual cognitive assessment sufficient');
  }

  return {
    riskScore: Math.min(riskScore, 100),
    riskCategory,
    factors,
    recommendations
  };
}

// Submit risk evaluation
app.post('/api/evaluation/evaluate', authenticateToken, async (req, res) => {
  try {
    const { lifestyle_factors } = req.body;
    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - 3);
    const cognitiveDocs = await CognitiveTest.find({ user_id: req.user.userId, completed_at: { $gte: sinceDate } })
      .select('test_type score max_score completed_at')
      .sort({ completed_at: -1 })
      .lean();
    const cognitiveScores = cognitiveDocs.map(doc => ({
      test_type: doc.test_type,
      score: doc.score,
      max_score: doc.max_score,
      percentage: (doc.score * 100.0) / doc.max_score
    }));

    const riskAssessment = calculateRiskScore(userProfile, cognitiveScores, lifestyle_factors);

    const created = await RiskEvaluation.create({
      user_id: req.user.userId,
      risk_category: riskAssessment.riskCategory,
      risk_score: riskAssessment.riskScore,
      factors: riskAssessment.factors,
      recommendations: riskAssessment.recommendations,
      evaluated_at: new Date()
    });

    res.status(201).json({
      message: 'Risk evaluation completed successfully',
      evaluation_id: created._id.toString(),
      risk_assessment: riskAssessment,
      user_profile: {
        age: userProfile.age,
        gender: userProfile.gender,
        family_history: userProfile.family_history,
        medical_conditions: userProfile.medical_conditions
      },
      cognitive_summary: {
        total_tests: cognitiveScores.length,
        average_score: cognitiveScores.length > 0 
          ? Math.round(cognitiveScores.reduce((sum, test) => sum + test.percentage, 0) / cognitiveScores.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Risk evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== REPORTS ROUTES =====

// Generate comprehensive PDF report
app.get('/api/reports/generate', authenticateToken, async (req, res) => {
  try {
    const userProfile = await User.findById(req.user.userId).lean();
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const latestRiskEval = await RiskEvaluation.findOne({ user_id: req.user.userId })
      .sort({ evaluated_at: -1 })
      .lean();

    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const testHistoryDocs = await CognitiveTest.find({ user_id: req.user.userId, completed_at: { $gte: since } })
      .select('test_type score max_score time_taken completed_at')
      .sort({ completed_at: -1 })
      .lean();
    const testHistory = testHistoryDocs.map(doc => ({
      test_type: doc.test_type,
      score: doc.score,
      max_score: doc.max_score,
      time_taken: doc.time_taken,
      completed_at: doc.completed_at,
      percentage: (doc.score * 100.0) / doc.max_score
    }));

    const agg = await CognitiveTest.aggregate([
      { $match: { user_id: new (require('mongoose').Types.ObjectId)(req.user.userId) } },
      { $group: {
          _id: null,
          total_tests: { $sum: 1 },
          average_percentage: { $avg: { $multiply: [{ $divide: ['$score', '$max_score'] }, 100] } },
          first_test: { $min: '$completed_at' },
          last_test: { $max: '$completed_at' }
        }
      }
    ]);
    const testStats = agg[0] || { total_tests: 0, average_percentage: 0, first_test: null, last_test: null };

    const pdf = generatePDFReport(userProfile, latestRiskEval, testHistory, testStats);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dementia-tracker-report-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdf.output('arraybuffer').byteLength);
    res.send(Buffer.from(pdf.output('arraybuffer')));
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate PDF report function
function generatePDFReport(userProfile, riskEval, testHistory, testStats) {
  const pdf = new jsPDF();
  let yPosition = 20;
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(44, 62, 80);
  pdf.text('Dementia Tracker Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Report date
  pdf.setFontSize(12);
  pdf.setTextColor(127, 140, 141);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
  
  yPosition += 25;

  // User Information Section
  pdf.setFontSize(16);
  pdf.setTextColor(44, 62, 80);
  pdf.text('Personal Information', margin, yPosition);
  
  yPosition += 15;
  
  pdf.setFontSize(11);
  pdf.setTextColor(52, 73, 94);
  
  const userInfo = [
    `Name: ${userProfile.first_name} ${userProfile.last_name}`,
    `Age: ${userProfile.age} years`,
    `Gender: ${userProfile.gender}`,
    `Family History: ${userProfile.family_history || 'None reported'}`,
    `Medical Conditions: ${userProfile.medical_conditions || 'None reported'}`
  ];
  
  userInfo.forEach(info => {
    pdf.text(info, margin, yPosition);
    yPosition += 8;
  });
  
  yPosition += 15;

  // Risk Assessment Section
  if (riskEval) {
    pdf.setFontSize(16);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Risk Assessment', margin, yPosition);
    
    yPosition += 15;
    
    pdf.setFontSize(11);
    pdf.setTextColor(52, 73, 94);
    
    const riskColor = riskEval.risk_category === 'High' ? [231, 76, 60] : 
                     riskEval.risk_category === 'Moderate' ? [243, 156, 18] : [46, 204, 113];
    
    pdf.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
    pdf.setFontSize(14);
    pdf.text(`Risk Level: ${riskEval.risk_category}`, margin, yPosition);
    
    yPosition += 12;
    
    pdf.setTextColor(52, 73, 94);
    pdf.setFontSize(11);
    pdf.text(`Risk Score: ${riskEval.risk_score}/100`, margin, yPosition);
    
    yPosition += 15;
  }

  // Test Performance Section
  pdf.setFontSize(16);
  pdf.setTextColor(44, 62, 80);
  pdf.text('Cognitive Test Performance', margin, yPosition);
  
  yPosition += 15;
  
  pdf.setFontSize(11);
  pdf.setTextColor(52, 73, 94);
  
  if (testStats) {
    const stats = [
      `Total Tests Completed: ${testStats.total_tests}`,
      `Average Performance: ${Math.round(testStats.average_percentage || 0)}%`,
      `First Test: ${testStats.first_test ? new Date(testStats.first_test).toLocaleDateString() : 'N/A'}`,
      `Last Test: ${testStats.last_test ? new Date(testStats.last_test).toLocaleDateString() : 'N/A'}`
    ];
    
    stats.forEach(stat => {
      pdf.text(stat, margin, yPosition);
      yPosition += 8;
    });
    
    yPosition += 15;
  }

  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(127, 140, 141);
  pdf.text('This report is generated by Dementia Tracker for educational and monitoring purposes only.', margin, yPosition);
  yPosition += 8;
  pdf.text('It is not a substitute for professional medical advice. Please consult with healthcare providers.', margin, yPosition);

  return pdf;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Dementia Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await connectMongo();
    console.log('✅ MongoDB initialized successfully');
    // Ensure default admin exists
    await (async function seedDefaultAdmin() {
      try {
        const adminEmail = 'admin@dementiatracker.com';
        const existing = await User.findOne({ email: adminEmail }).lean();
        if (existing) {
          console.log('👤 Default admin already exists');
          return;
        }
        const passwordHash = await bcrypt.hash('admin123', 10);
        await User.create({
          email: adminEmail,
          password_hash: passwordHash,
          first_name: 'System',
          last_name: 'Admin',
          age: 30,
          gender: 'Other',
          family_history: '',
          medical_conditions: ''
        });
        console.log('✅ Default admin user created');
      } catch (err) {
        console.error('❌ Failed to seed default admin:', err);
      }
    })();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Dementia Tracker API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });

    // Prevent server crashes from unhandled errors
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err);
      console.log('🔄 Server will continue running...');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      console.log('🔄 Server will continue running...');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        // Mongo connections will be closed by process exit
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        // Mongo connections will be closed by process exit
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
