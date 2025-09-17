import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Brain, ArrowLeft, TrendingUp, Award, Play, Target, Calendar, Plus, Trash2, Edit, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import TestResults from './TestResults';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

// ===== BASE TEST COMPONENT =====
const BaseTest = ({ testType, testName, instructions, children, onTestComplete, maxScore = 10, timeLimit = null }) => {
  const [currentStep, setCurrentStep] = useState('instructions'); // instructions, test, results
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingMetadata, setPendingMetadata] = useState(null);
  const [riskData, setRiskData] = useState(null);

  const startTest = useCallback(() => {
    setCurrentStep('test');
    setStartTime(new Date());
  }, []);

  const completeTest = useCallback((finalScoreOrPayload) => {
    setEndTime(new Date());
    let finalScore = typeof finalScoreOrPayload === 'number' ? finalScoreOrPayload : finalScoreOrPayload?.finalScore;
    const metadata = typeof finalScoreOrPayload === 'object' ? (finalScoreOrPayload?.metadata || null) : null;
    if (metadata) setPendingMetadata(metadata);
    // keep local score if needed for UI
    // setScore(finalScore);
    setCurrentStep('results');
    
    if (onTestComplete) {
      onTestComplete(finalScore);
    }
    // Build local result for Results screen
    const completionDate = new Date();
    const percentage = Math.max(0, Math.min(100, Math.round((finalScore / maxScore) * 100)));
    const performanceLevel = finalScore < 4 ? 'Low' : finalScore <= 7 ? 'Moderate' : 'High';
    const duration = startTime ? Math.round((completionDate - startTime) / 1000) : null;
    const completeTestResult = {
      id: 'local',
      test_type: testType,
      score: Number(finalScore?.toFixed ? finalScore.toFixed(2) : finalScore),
      max_score: maxScore,
      percentage,
      performance_level: performanceLevel,
      time_taken: duration,
      completed_at: completionDate.toISOString(),
      metadata: metadata || null,
    };
    setTestResult(completeTestResult);

    // Compute risk (single-test session for now)
    try {
      const testScores = [completeTestResult.score];
      const avgTestScore = testScores.reduce((a,b)=>a+b,0) / testScores.length;
      const test_risk = (1 - (avgTestScore / 10)) * 100;
      const age = user?.age || 0;
      const familyHistory = (user?.family_history && user.family_history.toLowerCase() !== 'none');
      const memorySymptoms = false; // placeholder
      const age_factor = age >= 75 ? 30 : age >= 65 ? 20 : age >= 60 ? 12 : 0;
      const demo_risk = Math.min(100, age_factor + (familyHistory ? 20 : 0) + (memorySymptoms ? 15 : 0));
      const weights = { tests: 0.7, demo: 0.3 };
      const final_risk = Math.max(0, Math.min(100, Math.round(weights.tests * test_risk + weights.demo * demo_risk)));
      const category = final_risk >= 50 ? 'High' : final_risk >= 20 ? 'Moderate' : 'Low';
      setRiskData({ final_risk, category, test_risk: Math.round(test_risk), demo_risk, weights, avgTestScore, perTests: { [testType]: completeTestResult.score } });
    } catch (e) {
      console.error('Risk compute error:', e);
    }
  }, [onTestComplete, maxScore, startTime, testType, user]);

  const handleQuit = useCallback(() => {
    const confirmQuit = window.confirm('Are you sure you want to quit? Unsaved progress will be lost.');
    if (confirmQuit) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const saveAndReturn = async () => {
    if (!testResult) return;
    setSubmitting(true);
    try {
      const payload = {
        userId: user?.id,
        testTypeId: testType,
        score: testResult.score,
        performanceLevel: testResult.performance_level,
        completionDate: testResult.completed_at,
        metadata: {
          timeTakenSeconds: testResult.time_taken,
          ...(pendingMetadata || {}),
        },
      };
      const response = await api.post('/results', payload);
      if (!response.data?.result) throw new Error('Failed to save result');
      // Save risk
      if (riskData) {
        await api.post('/risk', {
          userId: user?.id,
          riskScore: riskData.final_risk,
          category: riskData.category,
          contributingFactors: {
            test_risk: riskData.test_risk,
            demo_risk: riskData.demo_risk,
            weights: riskData.weights,
            factors: ['tests_weight', 'demo_weight']
          },
          createdAt: new Date().toISOString()
        });
      }
      notificationService.notifyTestSaved(response.data.result);
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Failed to save results';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const retakeTest = () => {
    setCurrentStep('instructions');
    setStartTime(null);
    setEndTime(null);
    setTestResult(null);
    setPendingMetadata(null);
    setRiskData(null);
  };

  // Unused helpers removed

  // Instructions Step
  if (currentStep === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="bg-white rounded-3xl p-8 shadow-soft animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full mb-6 shadow-soft">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">
                {testName}
              </h1>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                <Clock className="w-4 h-4 mr-2" />
                {timeLimit ? `${timeLimit} minutes` : 'Untimed'}
              </div>
            </div>

            {/* Instructions */}
            <div className="prose prose-lg max-w-none mb-8">
              {instructions}
            </div>

            {/* Test Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Objective</h3>
                <p className="text-sm text-gray-600">Complete the test accurately</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-secondary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Scoring</h3>
                <p className="text-sm text-gray-600">0-10 scale based on accuracy</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-accent-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Reward</h3>
                <p className="text-sm text-gray-600">Track your progress</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startTest}
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Test
              </button>
              <button
                onClick={() => navigate('/tests')}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary-200 text-primary-700 font-semibold rounded-2xl hover:bg-primary-50 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test Step
  if (currentStep === 'test') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-gray-900">{testName}</span>
                </div>
                <div className="flex items-center space-x-3">
                  {timeLimit && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Time remaining: {timeLimit}:00</span>
                    </div>
                  )}
                  <button onClick={handleQuit} className="px-4 py-2 text-sm font-semibold text-danger-700 border border-danger-200 rounded-xl hover:bg-danger-50">Quit</button>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300" style={{ width: '33%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Content */}
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4">
            {React.cloneElement(children, { onTestComplete: completeTest })}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => { /* explicit complete button; child still controls scoring */ completeTest({ finalScore: 0, metadata: {} }); }}
                className="inline-flex items-center px-6 py-3 rounded-2xl text-white font-semibold bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Complete & View Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results Step
  if (currentStep === 'results') {
    return (
      <TestResults
        testResult={testResult}
        onRetake={retakeTest}
        onViewHistory={() => navigate('/tests')}
        onSave={saveAndReturn}
        onReturnWithoutSaving={() => navigate('/dashboard')}
        saving={submitting}
        riskData={riskData}
        testName={testName}
        maxScore={maxScore}
      />
    );
  }

  return null;
};

// ===== PATTERN RECOGNITION TEST =====
const PatternRecognitionTest = ({ onTestComplete }) => {
  const [currentTrial, setCurrentTrial] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ correct: false, message: '' });

  // Test configuration
  const trials = useMemo(() => [
    {
      pattern: [2, 4, 6, 8, 10],
      options: [12, 14, 16, 18],
      correctAnswer: 12,
      explanation: 'Add 2 to each number'
    },
    {
      pattern: [1, 3, 6, 10, 15],
      options: [21, 25, 28, 30],
      correctAnswer: 21,
      explanation: 'Add 2, then 3, then 4, then 5, then 6'
    },
    {
      pattern: [2, 6, 12, 20, 30],
      options: [42, 44, 46, 48],
      correctAnswer: 42,
      explanation: 'Add 4, then 6, then 8, then 10, then 12'
    },
    {
      pattern: [1, 2, 4, 8, 16],
      options: [24, 28, 32, 36],
      correctAnswer: 32,
      explanation: 'Multiply by 2 each time'
    },
    {
      pattern: [3, 6, 12, 24, 48],
      options: [72, 84, 96, 108],
      correctAnswer: 96,
      explanation: 'Multiply by 2 each time'
    },
    {
      pattern: [1, 4, 9, 16, 25],
      options: [30, 36, 40, 45],
      correctAnswer: 36,
      explanation: 'Square numbers: 1², 2², 3², 4², 5², 6²'
    },
    {
      pattern: [2, 5, 10, 17, 26],
      options: [35, 37, 39, 41],
      correctAnswer: 37,
      explanation: 'Add 3, then 5, then 7, then 9, then 11'
    },
    {
      pattern: [1, 1, 2, 3, 5],
      options: [6, 7, 8, 9],
      correctAnswer: 8,
      explanation: 'Fibonacci sequence: add previous two numbers'
    }
  ], []);

  const trialTime = 15; // seconds per trial
  const feedbackTime = 3; // seconds to show feedback

  const instructions = (
    <div className="space-y-4">
      <p>
        This test measures your <strong>pattern recognition and logical reasoning</strong>. You will see sequences of numbers and need to identify the pattern.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">📝 Test Instructions:</h3>
        <p className="text-blue-700">
          Look at the sequence of numbers and identify the <strong>next number</strong> in the pattern.
        </p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">💡 Example:</h3>
        <div className="space-y-2">
          <div className="text-center p-3 bg-white rounded border">
            <p className="text-lg font-mono">2, 4, 6, 8, 10, ?</p>
            <p className="text-sm text-gray-600 mt-1">Pattern: Add 2 each time</p>
            <p className="text-sm text-gray-600">Answer: 12</p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2">🎯 What to do:</h3>
        <ul className="list-disc list-inside space-y-1 text-green-700">
          <li>Study the sequence of numbers</li>
          <li>Identify the mathematical pattern</li>
          <li>Choose the next number from the options</li>
          <li>You have {trialTime} seconds per trial</li>
          <li>Complete all {trials.length} trials</li>
        </ul>
      </div>
      
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-2">🧮 Common Patterns:</h3>
        <ul className="list-disc list-inside space-y-1 text-purple-700">
          <li>Arithmetic: Adding/subtracting the same number</li>
          <li>Geometric: Multiplying/dividing by the same number</li>
          <li>Quadratic: Square numbers, cube numbers</li>
          <li>Fibonacci: Each number is the sum of the previous two</li>
        </ul>
      </div>
    </div>
  );

  const handleAnswerSelect = (selectedAnswer) => {
    const currentTrialData = trials[currentTrial];
    const isCorrect = selectedAnswer === currentTrialData.correctAnswer;
    
    setUserAnswer(selectedAnswer);
    setFeedback({
      correct: isCorrect,
      message: isCorrect 
        ? 'Correct!' 
        : `Incorrect. The answer was ${currentTrialData.correctAnswer}. Pattern: ${currentTrialData.explanation}`
    });
    setShowFeedback(true);

    // Update score
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Show feedback for a few seconds, then move to next trial
    setTimeout(() => {
      setShowFeedback(false);
      setUserAnswer('');
      
      if (currentTrial < trials.length - 1) {
        setCurrentTrial(currentTrial + 1);
        setTimeLeft(trialTime);
      } else {
        // Test complete
        const correct = score + (isCorrect ? 1 : 0);
        const finalScore = Number(((correct / trials.length) * 10).toFixed(2));
        if (onTestComplete) {
          onTestComplete({
            finalScore,
            metadata: {
              totalTrials: trials.length,
              correctAnswers: correct,
            }
          });
        }
      }
    }, feedbackTime * 1000);
  };

  // Timer effect
  useEffect(() => {
    if (currentTrial < trials.length && !showFeedback) {
      const timer = setTimeout(() => {
        if (timeLeft > 1) {
          setTimeLeft(timeLeft - 1);
        } else {
          // Time's up - mark as incorrect and move to next trial
          const currentTrialData = trials[currentTrial];
          setFeedback({
            correct: false,
            message: `Time's up! The answer was ${currentTrialData.correctAnswer}. Pattern: ${currentTrialData.explanation}`
          });
          setShowFeedback(true);
          
          setTimeout(() => {
            setShowFeedback(false);
            setUserAnswer('');
            
            if (currentTrial < trials.length - 1) {
              setCurrentTrial(currentTrial + 1);
              setTimeLeft(trialTime);
            } else {
              // Test complete
              const correct = score;
              const finalScore = Number(((correct / trials.length) * 10).toFixed(2));
              if (onTestComplete) {
                onTestComplete({
                  finalScore,
                  metadata: {
                    totalTrials: trials.length,
                    correctAnswers: correct,
                  }
                });
              }
            }
          }, feedbackTime * 1000);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentTrial, timeLeft, showFeedback, trials, score, onTestComplete]);

  // Initialize first trial
  useEffect(() => {
    if (currentTrial === 0 && timeLeft === 0) {
      setTimeLeft(trialTime);
    }
  }, [currentTrial, timeLeft, trialTime]);

  const renderTrial = () => {
    if (currentTrial >= trials.length) return null;
    
    const trial = trials[currentTrial];
    
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            Trial {currentTrial + 1} of {trials.length}
          </div>
          <div className="text-2xl text-gray-600 mb-4">
            <Clock className="inline-block w-6 h-6 mr-2" />
            {timeLeft}s
          </div>
        </div>
        
        <div className="mb-8">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
            {trial.pattern.map((num, index) => (
              <span key={index}>
                {num}
                {index < trial.pattern.length - 1 ? ', ' : ''}
              </span>
            ))}
            <span className="text-blue-600">, ?</span>
          </div>
          <p className="text-gray-600 text-lg">
            What comes next in this pattern?
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
          {trial.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswerSelect(option)}
              disabled={showFeedback}
              className={`btn btn-lg py-4 text-lg font-semibold font-mono transition-all ${
                showFeedback && userAnswer === option
                  ? feedback.correct
                    ? 'btn-success'
                    : 'btn-danger'
                  : 'btn-outline hover:btn-primary'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        
        {showFeedback && (
          <div className={`mt-6 p-4 rounded-lg border ${
            feedback.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-center mb-2">
              {feedback.correct ? (
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 mr-2" />
              )}
              <span className={`font-medium ${
                feedback.correct ? 'text-green-800' : 'text-red-800'
              }`}>
                {feedback.message}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseTest
      testType="pattern_recognition"
      testName="Pattern Recognition Memory (PRM) Test"
      instructions={instructions}
      maxScore={10}
      timeLimit={Math.ceil((trials.length * trialTime) / 60)}
    >
      {renderTrial()}
    </BaseTest>
  );
};

// ===== STROOP TEST =====
const StroopTest = ({ onTestComplete }) => {
  const [currentTrial, setCurrentTrial] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ correct: false, message: '' });
  const [trialStartTs, setTrialStartTs] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]); // seconds per trial

  // Test configuration
  const trials = useMemo(() => {
    const base = [
      { word: 'RED', color: 'blue', correctAnswer: 'blue' },
      { word: 'BLUE', color: 'red', correctAnswer: 'red' },
      { word: 'GREEN', color: 'yellow', correctAnswer: 'yellow' },
      { word: 'YELLOW', color: 'green', correctAnswer: 'green' },
      { word: 'RED', color: 'green', correctAnswer: 'green' },
      { word: 'BLUE', color: 'yellow', correctAnswer: 'yellow' },
      { word: 'GREEN', color: 'red', correctAnswer: 'red' },
      { word: 'YELLOW', color: 'blue', correctAnswer: 'blue' },
      { word: 'RED', color: 'yellow', correctAnswer: 'yellow' },
      { word: 'BLUE', color: 'green', correctAnswer: 'green' }
    ];
    // Repeat to reach ~30 trials
    return [...base, ...base, ...base];
  }, []);

  const trialTime = 5; // seconds per trial
  const feedbackTime = 2; // seconds to show feedback

  const instructions = (
    <div className="space-y-4">
      <p>
        This test measures your <strong>attention and cognitive control</strong>. You will see color words written in different colored text.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">📝 Test Instructions:</h3>
        <p className="text-blue-700">
          <strong>Ignore the word itself</strong> and identify the <strong>color of the text</strong>.
        </p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">💡 Example:</h3>
        <div className="space-y-2">
          <div className="text-center p-3 bg-white rounded border">
            <span style={{ color: 'blue' }} className="text-2xl font-bold">RED</span>
            <p className="text-sm text-gray-600 mt-1">Answer: BLUE (the color of the text)</p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2">🎯 What to do:</h3>
        <ul className="list-disc list-inside space-y-1 text-green-700">
          <li>Look at the color of the text (not the word)</li>
          <li>Click the button with the correct color name</li>
          <li>You have {trialTime} seconds per trial</li>
          <li>Complete all {trials.length} trials</li>
        </ul>
      </div>
    </div>
  );

  const colors = ['red', 'blue', 'green', 'yellow'];

  const getColorStyle = (color) => {
    const colorMap = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#10b981',
      yellow: '#f59e0b'
    };
    return { color: colorMap[color] };
  };

  const handleColorSelect = (selectedColor) => {
    const currentTrialData = trials[currentTrial];
    const isCorrect = selectedColor === currentTrialData.correctAnswer;
    const rt = trialStartTs ? (Date.now() - trialStartTs) / 1000 : null;
    if (rt !== null) setResponseTimes(prev => [...prev, rt]);
    
    setUserAnswer(selectedColor);
    setFeedback({
      correct: isCorrect,
      message: isCorrect ? 'Correct!' : `Incorrect. The text color was ${currentTrialData.correctAnswer}.`
    });
    setShowFeedback(true);

    // Update score
    if (isCorrect) setCorrectCount(prev => prev + 1);

    // Show feedback for a few seconds, then move to next trial
    setTimeout(() => {
      setShowFeedback(false);
      setUserAnswer('');
      
      if (currentTrial < trials.length - 1) {
        setCurrentTrial(currentTrial + 1);
        setTimeLeft(trialTime);
        setTrialStartTs(Date.now());
      } else {
        // Test complete
        const total = trials.length;
        const correct = correctCount + (isCorrect ? 1 : 0);
        const basePercent = (correct / total) * 100;
        const avgRT = responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : (rt || 0);
        const penalty = avgRT > 2 ? Math.min(20, (avgRT - 2) * 10) : 0; // up to -20%
        const finalPercent = Math.max(0, Math.min(100, basePercent - penalty));
        const finalScore = Number(((finalPercent / 100) * 10).toFixed(2));
        if (onTestComplete) {
          onTestComplete({
            finalScore,
            metadata: {
              totalTrials: total,
              correctResponses: correct,
              avgResponseTimeSeconds: avgRT,
              responseTimes,
              basePercent,
              penaltyPercent: penalty,
              finalPercent
            }
          });
        }
      }
    }, feedbackTime * 1000);
  };

  // Timer effect
  useEffect(() => {
    if (currentTrial < trials.length && !showFeedback) {
      const timer = setTimeout(() => {
        if (timeLeft > 1) {
          setTimeLeft(timeLeft - 1);
        } else {
          // Time's up - mark as incorrect and move to next trial
          setFeedback({
            correct: false,
            message: `Time's up! The text color was ${trials[currentTrial].correctAnswer}.`
          });
          setShowFeedback(true);
          
          setTimeout(() => {
            setShowFeedback(false);
            setUserAnswer('');
            
            if (currentTrial < trials.length - 1) {
              setCurrentTrial(currentTrial + 1);
              setTimeLeft(trialTime);
              setTrialStartTs(Date.now());
            } else {
              // Test complete
              const total = trials.length;
              const correct = correctCount;
              const basePercent = (correct / total) * 100;
              const avgRT = responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
              const penalty = avgRT > 2 ? Math.min(20, (avgRT - 2) * 10) : 0;
              const finalPercent = Math.max(0, Math.min(100, basePercent - penalty));
              const finalScore = Number(((finalPercent / 100) * 10).toFixed(2));
              if (onTestComplete) {
                onTestComplete({
                  finalScore,
                  metadata: {
                    totalTrials: total,
                    correctResponses: correct,
                    avgResponseTimeSeconds: avgRT,
                    responseTimes,
                    basePercent,
                    penaltyPercent: penalty,
                    finalPercent
                  }
                });
              }
            }
          }, feedbackTime * 1000);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentTrial, timeLeft, showFeedback, trials, correctCount, responseTimes, onTestComplete]);

  // Initialize first trial
  useEffect(() => {
    if (currentTrial === 0 && timeLeft === 0) {
      setTimeLeft(trialTime);
      setTrialStartTs(Date.now());
    }
  }, [currentTrial, timeLeft, trialTime]);

  const renderTrial = () => {
    if (currentTrial >= trials.length) return null;
    
    const trial = trials[currentTrial];
    
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            Trial {currentTrial + 1} of {trials.length}
          </div>
          <div className="text-2xl text-gray-600 mb-4">
            <Clock className="inline-block w-6 h-6 mr-2" />
            {timeLeft}s
          </div>
        </div>
        
        <div className="mb-8">
          <div className="text-6xl font-bold mb-4" style={getColorStyle(trial.color)}>
            {trial.word}
          </div>
          <p className="text-gray-600 text-lg">
            What color is the text?
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              disabled={showFeedback}
              className={`btn btn-lg py-4 text-lg font-semibold capitalize transition-all ${
                showFeedback && userAnswer === color
                  ? feedback.correct
                    ? 'btn-success'
                    : 'btn-danger'
                  : 'btn-outline hover:btn-primary'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
        
        {showFeedback && (
          <div className={`mt-6 p-4 rounded-lg border ${
            feedback.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-center">
              {feedback.correct ? (
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 mr-2" />
              )}
              <span className={`font-medium ${
                feedback.correct ? 'text-green-800' : 'text-red-800'
              }`}>
                {feedback.message}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseTest
      testType="stroop"
      testName="Stroop Color–Word Interference Test"
      instructions={instructions}
      maxScore={10}
      timeLimit={Math.ceil((trials.length * trialTime) / 60)}
    >
      {renderTrial()}
    </BaseTest>
  );
};

// ===== WORD RECALL TEST =====
const WordRecallTest = ({ onTestComplete }) => {
  const [currentPhase, setCurrentPhase] = useState('study'); // study, delay, recall
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInputs, setUserInputs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  // Test configuration
  const words = useMemo(() => [
    'apple', 'river', 'mountain', 'ocean', 'forest',
    'sunset', 'bridge', 'garden', 'castle', 'star'
  ], []);
  const studyTime = 3; // seconds per word
  const delayTime = 30; // seconds delay before recall

  const instructions = (
    <div className="space-y-4">
      <p>
        This test measures your <strong>memory and recall abilities</strong>. You will see a series of words one at a time.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">📝 Test Structure:</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li><strong>Study Phase:</strong> You'll see {words.length} words, one every {studyTime} seconds</li>
          <li><strong>Delay Phase:</strong> {delayTime} second break to clear your mind</li>
          <li><strong>Recall Phase:</strong> Type as many words as you can remember</li>
        </ol>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">💡 Tips:</h3>
        <ul className="list-disc list-inside space-y-1 text-yellow-700">
          <li>Pay attention to each word as it appears</li>
          <li>Try to create mental associations or stories</li>
          <li>Don't worry about spelling - close matches count</li>
        </ul>
      </div>
    </div>
  );



  const startDelayPhase = useCallback(() => {
    setCurrentPhase('delay');
    setTimeLeft(delayTime);
  }, []);

  const startRecallPhase = useCallback(() => {
    setCurrentPhase('recall');
    setUserInputs(new Array(words.length).fill(''));
  }, []);

  const handleWordInput = (index, value) => {
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const calculateScore = useCallback(() => {
    let correctWords = 0;
    const userWords = userInputs.map(input => input.trim().toLowerCase());
    const uniqueCorrect = new Set();
    words.forEach(word => {
      const wordLower = word.toLowerCase();
      // Check for exact matches or close matches (allowing for typos)
      const matched = userWords.some(userWord => 
        userWord === wordLower ||
        userWord.includes(wordLower) || wordLower.includes(userWord) ||
        (userWord.length > 3 && wordLower.length > 3 && userWord.slice(0, 3) === wordLower.slice(0, 3))
      );
      if (matched) uniqueCorrect.add(wordLower);
    });
    correctWords = uniqueCorrect.size;

    // Calculate score on 0-10 scale
    const percentage = (correctWords / words.length) * 100;
    const finalScore = Number(((percentage / 100) * 10).toFixed(2));
    return { finalScore, correctWords };
  }, [userInputs, words]);

  const handleRecallComplete = useCallback(() => {
    const { finalScore, correctWords } = calculateScore();
    if (onTestComplete) {
      onTestComplete({
        finalScore,
        metadata: {
          totalTrials: words.length,
          correctResponses: correctWords,
        }
      });
    }
  }, [calculateScore, onTestComplete, words.length]);

  // Timer effects
  useEffect(() => {
    if (currentPhase === 'study' && currentWordIndex < words.length) {
      const timer = setTimeout(() => {
        if (timeLeft > 1) {
          setTimeLeft(timeLeft - 1);
        } else {
          if (currentWordIndex < words.length - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
            setTimeLeft(studyTime);
          } else {
            startDelayPhase();
          }
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentPhase, currentWordIndex, timeLeft, startDelayPhase, words.length, studyTime]);

  useEffect(() => {
    if (currentPhase === 'delay') {
      const timer = setTimeout(() => {
        if (timeLeft > 1) {
          setTimeLeft(timeLeft - 1);
        } else {
          startRecallPhase();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentPhase, timeLeft, startRecallPhase]);

  // Initialize first word
  useEffect(() => {
    if (currentPhase === 'study' && currentWordIndex === 0 && timeLeft === 0) {
      setTimeLeft(studyTime);
    }
  }, [currentPhase, currentWordIndex, timeLeft, studyTime]);

  const renderStudyPhase = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="text-sm text-gray-500 mb-2">Word {currentWordIndex + 1} of {words.length}</div>
        <div className="text-2xl text-gray-600 mb-4">
          <Clock className="inline-block w-6 h-6 mr-2" />
          {timeLeft}s
        </div>
      </div>
      
      <div className="text-6xl font-bold text-blue-600 mb-8 animate-pulse">
        {words[currentWordIndex]}
      </div>
      
      <div className="text-gray-600">
        Memorize this word. You'll be asked to recall it later.
      </div>
    </div>
  );

  const renderDelayPhase = () => (
    <div className="text-center">
      <div className="mb-8">
        <Brain className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          Processing Time
        </h3>
        <div className="text-4xl font-bold text-purple-600 mb-4">
          {timeLeft}s
        </div>
        <p className="text-gray-600">
          Take a moment to clear your mind. The recall phase will begin shortly.
        </p>
      </div>
    </div>
  );

  const renderRecallPhase = () => (
    <div>
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          📝 Recall the Words
        </h3>
        <p className="text-gray-600">
          Type as many words as you can remember from the study phase.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {words.map((word, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Word {index + 1}:
            </label>
            <input
              type="text"
              value={userInputs[index] || ''}
              onChange={(e) => handleWordInput(index, e.target.value)}
              className="input w-full"
              placeholder="Type the word you remember..."
              autoFocus={index === 0}
            />
          </div>
        ))}
      </div>
      
      <div className="text-center">
        <button
          onClick={handleRecallComplete}
          className="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold"
        >
          ✅ Complete Recall
        </button>
      </div>
    </div>
  );

  const renderTestContent = () => {
    switch (currentPhase) {
      case 'study':
        return renderStudyPhase();
      case 'delay':
        return renderDelayPhase();
      case 'recall':
        return renderRecallPhase();
      default:
        return null;
    }
  };

  return (
    <BaseTest
      testType="word_recall"
      testName="Hopkins Verbal Learning Test–Revised (HVLT-R)"
      instructions={instructions}
      maxScore={10}
      timeLimit={Math.ceil((words.length * studyTime + delayTime) / 60)}
    >
      {renderTestContent()}
    </BaseTest>
  );
};

// ===== TEST SCHEDULER =====
const TestScheduler = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    test_type: '',
    scheduled_date: '',
    scheduled_time: '',
    frequency: 'weekly',
    notes: ''
  });

  const testTypes = [
    { value: 'word_recall', label: 'Hopkins Verbal Learning Test–Revised (HVLT-R)', icon: Brain, color: 'primary' },
    { value: 'stroop', label: 'Stroop Color–Word Interference Test', icon: Target, color: 'secondary' },
    { value: 'pattern_recognition', label: 'Pattern Recognition Memory (PRM) Test', icon: TrendingUp, color: 'accent' }
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'weekly', label: 'Weekly', description: 'Once a week' },
    { value: 'bi_weekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly', description: 'Once a month' }
  ];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/users/test-schedule');
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load test schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.test_type || !formData.scheduled_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingSchedule) {
        await api.put(`/users/test-schedule/${editingSchedule.id}`, formData);
        toast.success('Schedule updated successfully!');
      } else {
        await api.post('/users/schedule-test', formData);
        toast.success('Test scheduled successfully!');
      }
      
      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      test_type: schedule.test_type,
      scheduled_date: schedule.scheduled_date,
      scheduled_time: schedule.scheduled_time || '',
      frequency: schedule.frequency || 'weekly',
      notes: schedule.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await api.delete(`/users/test-schedule/${scheduleId}`);
        toast.success('Schedule deleted successfully!');
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.error('Failed to delete schedule');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      test_type: '',
      scheduled_date: '',
      scheduled_time: '',
      frequency: 'weekly',
      notes: ''
    });
  };

  const getTestLabel = (testType) => {
    const test = testTypes.find(t => t.value === testType);
    return test ? test.label : testType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
          Test Scheduler
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Schedule regular cognitive assessments to maintain consistent monitoring of your brain health. 
          Set reminders and track your testing routine.
        </p>
      </div>

      {/* Schedule Test Button */}
      <div className="text-center">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" />
          Schedule New Test
        </button>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <div className="bg-white rounded-3xl p-8 shadow-soft animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-display font-bold text-gray-900">
              {editingSchedule ? 'Edit Schedule' : 'Schedule New Test'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingSchedule(null);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Test Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Type *
                </label>
                <select
                  value={formData.test_type}
                  onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  required
                >
                  <option value="">Select test type</option>
                  {testTypes.map((test) => (
                    <option key={test.value} value={test.value}>
                      {test.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label} - {freq.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  required
                />
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Time
                </label>
                <input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                placeholder="Add any notes or reminders..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-medium rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
              >
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules List */}
      <div className="space-y-6">
        <h3 className="text-2xl font-display font-bold text-gray-900">
          Your Test Schedule
        </h3>
        
        {schedules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl shadow-soft">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No schedules yet</h4>
            <p className="text-gray-500 mb-4">
              Schedule your first cognitive test to start building a regular testing routine.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Test
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Brain className="w-6 h-6 text-primary-600" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {getTestLabel(schedule.test_type)}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>Date: {new Date(schedule.scheduled_date).toLocaleDateString()}</span>
                        </div>
                        {schedule.scheduled_time && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>Time: {schedule.scheduled_time}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Target className="w-4 h-4 mr-2" />
                          <span>Frequency: {schedule.frequency}</span>
                        </div>
                      </div>
                      
                      {schedule.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{schedule.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors duration-300"
                      title="Edit schedule"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 text-danger-600 hover:bg-danger-50 rounded-xl transition-colors duration-300"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== TESTS COMPONENT =====
const Tests = () => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
          Available Tests
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose from our comprehensive suite of cognitive assessments designed to evaluate different aspects of brain health.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Hopkins Verbal Learning Test–Revised (HVLT-R)</h3>
            <p className="text-gray-600 mb-4">Test your memory and recall abilities with this comprehensive assessment.</p>
            <Link to="/test/word_recall" className="btn btn-primary w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Test
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-secondary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Stroop Color–Word Interference Test</h3>
            <p className="text-gray-600 mb-4">Measure attention and cognitive control with this classic test.</p>
            <Link to="/test/stroop" className="btn btn-secondary w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Test
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300">
          <div className="text-center">
            <div className="w-16 h-16 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-accent-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pattern Recognition Memory (PRM) Test</h3>
            <p className="text-gray-600 mb-4">Test your logical reasoning and pattern identification skills.</p>
            <Link to="/test/pattern_recognition" className="btn btn-accent w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Test
            </Link>
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">
          Test Scheduler
        </h3>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          Schedule regular cognitive assessments to maintain consistent monitoring of your brain health.
        </p>
        <TestScheduler />
      </div>
    </div>
  );
};

export default Tests;
export { BaseTest, PatternRecognitionTest, StroopTest, WordRecallTest, TestScheduler };
