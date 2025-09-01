const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jsPDF = require('jspdf');
require('dotenv').config();

// Initialize notification service
require('./services/notificationService');

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
  try {
    const db = getDatabase();
    db.get('SELECT 1 as test', (err, row) => {
      if (err) {
        console.error('❌ Health check database error:', err);
        return res.status(500).json({ 
          status: 'error', 
          message: 'Database connection failed',
          error: err.message 
        });
      }
      res.json({ 
        status: 'healthy', 
        message: 'Server and database are running',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Database initialization
const { initDatabase, getDatabase } = require('./database/init');

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

    const db = getDatabase();
    
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      db.run(`
        INSERT INTO users (email, password_hash, first_name, last_name, age, gender, family_history, medical_conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [email, passwordHash, first_name, last_name, age, gender, family_history || '', medical_conditions || ''], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const userId = this.lastID;
        const token = jwt.sign(
          { userId, email, first_name, last_name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: userId, email, first_name, last_name, age, gender, family_history, medical_conditions }
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('🔐 Login attempt received:', { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();
    
    if (!db) {
      console.error('❌ Login failed: Database connection not available');
      return res.status(500).json({ error: 'Database connection error' });
    }

    console.log('🔍 Querying database for user:', email);
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('❌ Database error during login:', err);
        return res.status(500).json({ error: 'Database error' });
      }

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
        { userId: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ Login successful for user:', email);
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name,
          age: user.age, gender: user.gender, family_history: user.family_history, medical_conditions: user.medical_conditions
        }
      });
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();

    db.get('SELECT id, email, first_name, last_name, age, gender, family_history, medical_conditions, created_at FROM users WHERE id = ?', 
      [req.user.userId], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
      });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { first_name, last_name, age, gender, family_history, medical_conditions } = req.body;

    if (!first_name || !last_name || !age || !gender) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (age < 18 || age > 120) {
      return res.status(400).json({ error: 'Age must be between 18 and 120' });
    }

    const db = getDatabase();

    db.run(`
      UPDATE users 
      SET first_name = ?, last_name = ?, age = ?, gender = ?, family_history = ?, medical_conditions = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [first_name, last_name, age, gender, family_history || '', medical_conditions || '', req.user.userId], function(err) {
              if (err) {
          return res.status(500).json({ error: 'Failed to update profile' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully' });
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USER ROUTES =====

// Get user dashboard data
app.get('/api/users/dashboard', authenticateToken, (req, res) => {
  try {
    console.log('📊 Fetching dashboard data for user:', req.user.userId);
    const db = getDatabase();

    db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, userProfile) => {
      if (err) {
        console.error('❌ Dashboard user profile error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!userProfile) {
        console.error('❌ User profile not found for ID:', req.user.userId);
        return res.status(404).json({ error: 'User profile not found' });
      }

      console.log('✅ User profile found:', userProfile.first_name, userProfile.last_name);

      // Get risk evaluation
      db.get(`
        SELECT risk_category, risk_score, evaluated_at
        FROM risk_evaluations 
        WHERE user_id = ? 
        ORDER BY evaluated_at DESC 
        LIMIT 1
      `, [req.user.userId], (err, latestRiskEval) => {
        if (err) {
          console.error('❌ Dashboard risk evaluation error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get test statistics
        db.get(`
          SELECT 
            COUNT(*) as total_tests,
            AVG(score * 100.0 / max_score) as average_percentage,
            MAX(completed_at) as last_test_date
          FROM cognitive_tests 
          WHERE user_id = ?
        `, [req.user.userId], (err, testStats) => {
          if (err) {
            console.error('❌ Dashboard test stats error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Get recent tests
          db.all(`
            SELECT 
              test_type,
              (score * 100.0 / max_score) as percentage,
              completed_at
            FROM cognitive_tests 
            WHERE user_id = ? 
            ORDER BY completed_at DESC 
            LIMIT 5
          `, [req.user.userId], (err, recentTests) => {
            if (err) {
              console.error('❌ Dashboard recent tests error:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            // Get next scheduled test
            db.get(`
              SELECT test_type, scheduled_date
              FROM test_schedules 
              WHERE user_id = ? 
              AND status = 'scheduled' 
              AND scheduled_date >= DATE('now')
              ORDER BY scheduled_date ASC 
              LIMIT 1
            `, [req.user.userId], (err, nextScheduledTest) => {
              if (err) {
                console.error('❌ Dashboard scheduled test error:', err);
                return res.status(500).json({ error: 'Database error' });
              }

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
                  last_test_date: testStats.last_test_date
                },
                recent_tests: recentTests || [],
                next_scheduled_test: nextScheduledTest,
                last_updated: new Date().toISOString()
              };
              
              console.log('✅ Dashboard data fetched successfully for user:', req.user.userId);
              res.json({ dashboard: dashboardData });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('❌ Dashboard fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TEST ROUTES =====

// Submit cognitive test result
app.post('/api/tests/submit', authenticateToken, (req, res) => {
  try {
    const { test_type, score, max_score, time_taken, test_data } = req.body;

    if (!test_type || score === undefined || !max_score) {
      return res.status(400).json({ error: 'Test type, score, and max score are required' });
    }

    if (score < 0 || score > max_score) {
      return res.status(400).json({ error: 'Invalid score value' });
    }

    const db = getDatabase();

    db.run(`
      INSERT INTO cognitive_tests (user_id, test_type, score, max_score, time_taken, test_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.userId, test_type, score, max_score, time_taken || null, JSON.stringify(test_data) || null], function(err) {
              if (err) {
          return res.status(500).json({ error: 'Failed to save test result' });
        }

        const testId = this.lastID;

        res.status(201).json({
        message: 'Test result saved successfully',
        test_id: testId,
        score,
        max_score,
        percentage: Math.round((score / max_score) * 100)
      });
    });
  } catch (error) {
    console.error('Test submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's test history
app.get('/api/tests/history', authenticateToken, (req, res) => {
  try {
    const { limit = 50, offset = 0, test_type } = req.query;
    const db = getDatabase();

    let query = `
      SELECT id, test_type, score, max_score, time_taken, completed_at
      FROM cognitive_tests 
      WHERE user_id = ?
    `;
    let params = [req.user.userId];

    if (test_type) {
      query += ' AND test_type = ?';
      params.push(test_type);
    }

    query += ' ORDER BY completed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, tests) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const testsWithMetrics = tests.map(test => ({
        ...test,
        percentage: Math.round((test.score / test.max_score) * 100),
        score_percentage: (test.score / test.max_score) * 100
      }));

      res.json({ tests: testsWithMetrics });
    });
  } catch (error) {
    console.error('Test history fetch error:', error);
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
app.post('/api/evaluation/evaluate', authenticateToken, (req, res) => {
  try {
    const { lifestyle_factors } = req.body;
    const db = getDatabase();

    db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, userProfile) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!userProfile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      db.all(`
        SELECT test_type, score, max_score, (score * 100.0 / max_score) as percentage
        FROM cognitive_tests 
        WHERE user_id = ? 
        AND completed_at >= datetime('now', '-3 months')
        ORDER BY completed_at DESC
      `, [req.user.userId], (err, cognitiveScores) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const riskAssessment = calculateRiskScore(userProfile, cognitiveScores, lifestyle_factors);

        db.run(`
          INSERT INTO risk_evaluations (user_id, risk_category, risk_score, factors, recommendations)
          VALUES (?, ?, ?, ?, ?)
        `, [
          req.user.userId,
          riskAssessment.riskCategory,
          riskAssessment.riskScore,
          JSON.stringify(riskAssessment.factors),
          JSON.stringify(riskAssessment.recommendations)
        ], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save risk evaluation' });
          }

          const evaluationId = this.lastID;

          res.status(201).json({
            message: 'Risk evaluation completed successfully',
            evaluation_id: evaluationId,
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
        });
      });
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
    const db = getDatabase();
    
    db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, userProfile) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!userProfile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      db.get(`
        SELECT * FROM risk_evaluations 
        WHERE user_id = ? 
        ORDER BY evaluated_at DESC 
        LIMIT 1
      `, [req.user.userId], (err, latestRiskEval) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        db.all(`
          SELECT test_type, score, max_score, time_taken, completed_at,
                 (score * 100.0 / max_score) as percentage
          FROM cognitive_tests 
          WHERE user_id = ? 
          AND completed_at >= datetime('now', '-12 months')
          ORDER BY completed_at DESC
        `, [req.user.userId], (err, testHistory) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          db.get(`
            SELECT 
              COUNT(*) as total_tests,
              AVG(score * 100.0 / max_score) as average_percentage,
              MIN(completed_at) as first_test,
              MAX(completed_at) as last_test
            FROM cognitive_tests 
            WHERE user_id = ?
          `, [req.user.userId], (err, testStats) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Generate PDF report
            const pdf = generatePDFReport(userProfile, latestRiskEval, testHistory, testStats);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="dementia-tracker-report-${Date.now()}.pdf"`);
            res.setHeader('Content-Length', pdf.output('arraybuffer').byteLength);
            
            res.send(Buffer.from(pdf.output('arraybuffer')));
          });
        });
      });
    });
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
    await initDatabase();
    console.log('✅ Database initialized successfully');
    
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
        const { closeDatabase } = require('./database/init');
        closeDatabase();
        console.log('✅ Database closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        const { closeDatabase } = require('./database/init');
        closeDatabase();
        console.log('✅ Database closed');
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
