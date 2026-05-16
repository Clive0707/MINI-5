import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Brain, ArrowLeft, TrendingUp, Award, Play, Target, Calendar, Plus, Trash2, Edit, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';
import TestResults from './TestResults';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';


// ===== BASE TEST COMPONENT =====
const BaseTest = ({ testType, testName, instructions, children, onTestComplete, maxScore = 10, timeLimit = null }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState('instructions'); // instructions, test, results
  const [startTime, setStartTime] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingMetadata, setPendingMetadata] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [baselineComparison, setBaselineComparison] = useState(null);

  const startTest = useCallback(() => {
    setCurrentStep('test');
    setStartTime(new Date());
  }, []);

  const completeTest = useCallback((finalScoreOrPayload) => {
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
    const confirmQuit = window.confirm(t('testContent.quitConfirm'));
    if (confirmQuit) {
      navigate('/dashboard');
    }
  }, [navigate, t]);

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
      setBaselineComparison(response.data?.baselineComparison ?? null);
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
                {timeLimit ? `${timeLimit} minutes` : t('testContent.untimed')}
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
                <h3 className="font-semibold text-gray-900 mb-1">{t('testContent.objective')}</h3>
                <p className="text-sm text-gray-600">{t('testContent.objectiveDesc')}</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-secondary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('testContent.scoring')}</h3>
                <p className="text-sm text-gray-600">{t('testContent.scoringDesc')}</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-accent-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('testContent.reward')}</h3>
                <p className="text-sm text-gray-600">{t('testContent.rewardDesc')}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startTest}
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
              >
                <Play className="w-5 h-5 mr-2" />
                {t('testContent.startTest')}
              </button>
              <button
                onClick={() => navigate('/tests')}
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary-200 text-primary-700 font-semibold rounded-2xl hover:bg-primary-50 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {t('testContent.backToTests')}
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
                      <span>{t('testContent.timeRemaining')}: {timeLimit}:00</span>
                    </div>
                  )}
                  <button onClick={handleQuit} className="px-4 py-2 text-sm font-semibold text-danger-700 border border-danger-200 rounded-xl hover:bg-danger-50">{t('testContent.quit')}</button>
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
            {typeof children === 'function' 
              ? children({ onTestComplete: completeTest })
              : React.cloneElement(children, { onTestComplete: completeTest })}
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
        baselineComparison={baselineComparison}
        testName={testName}
        maxScore={maxScore}
      />
    );
  }

  return null;
};

// ===== PATTERN RECOGNITION TEST =====
const PatternRecognitionTest = ({ onTestComplete }) => {
  const { t } = useTranslation();
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
        {t('testContent.pattern.measures')} <strong>{t('testContent.pattern.patternRecognition')}</strong>{t('testContent.pattern.measures2')}
      </p>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">{t('testContent.pattern.instructionTitle')}</h3>
        <p className="text-blue-700">
          {t('testContent.pattern.instructionText')}
        </p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">{t('testContent.pattern.exampleTitle')}</h3>
        <div className="space-y-2">
          <div className="text-center p-3 bg-white rounded border">
            <p className="text-lg font-mono">{t('testContent.pattern.examplePattern')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('testContent.pattern.examplePatternDesc')}</p>
            <p className="text-sm text-gray-600">{t('testContent.pattern.exampleAnswer')}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2">{t('testContent.pattern.whatToDoTitle')}</h3>
        <ul className="list-disc list-inside space-y-1 text-green-700">
          <li>{t('testContent.pattern.studySequence')}</li>
          <li>{t('testContent.pattern.identifyPattern')}</li>
          <li>{t('testContent.pattern.chooseNext')}</li>
          <li>{t('testContent.pattern.youHaveSeconds', { seconds: trialTime })}</li>
          <li>{t('testContent.pattern.completeAllTrials', { total: trials.length })}</li>
        </ul>
      </div>
      
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-2">{t('testContent.pattern.commonPatternsTitle')}</h3>
        <ul className="list-disc list-inside space-y-1 text-purple-700">
          <li>{t('testContent.pattern.arithmetic')}</li>
          <li>{t('testContent.pattern.geometric')}</li>
          <li>{t('testContent.pattern.quadratic')}</li>
          <li>{t('testContent.pattern.fibonacci')}</li>
        </ul>
      </div>
    </div>
  );

  const handleAnswerSelect = (selectedAnswer, onTestComplete) => {
    const currentTrialData = trials[currentTrial];
    const isCorrect = selectedAnswer === currentTrialData.correctAnswer;
    
    setUserAnswer(selectedAnswer);
    setFeedback({
      correct: isCorrect,
      message: isCorrect 
        ? t('testContent.correct') 
        : t('testContent.incorrect', { answer: currentTrialData.correctAnswer, explanation: currentTrialData.explanation })
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

  // Store onTestComplete in a ref so timer effect can access it
  const onTestCompleteRef = useRef(null);
  
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
            message: t('testContent.timesUp', { answer: currentTrialData.correctAnswer, explanation: currentTrialData.explanation })
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
              if (onTestCompleteRef.current) {
                onTestCompleteRef.current({
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrial, timeLeft, showFeedback, trials, score, trialTime, feedbackTime]);

  // Initialize first trial
  useEffect(() => {
    if (currentTrial === 0 && timeLeft === 0) {
      setTimeLeft(trialTime);
    }
  }, [currentTrial, timeLeft, trialTime]);

  const renderTrial = (onTestComplete) => {
    if (currentTrial >= trials.length) return null;
    
    // Update ref when onTestComplete changes
    onTestCompleteRef.current = onTestComplete;
    
    const trial = trials[currentTrial];
    
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            {t('testContent.trialOf', { current: currentTrial + 1, total: trials.length })}
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
            {t('testContent.whatComesNext')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
          {trial.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswerSelect(option, onTestComplete)}
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
      {({ onTestComplete }) => renderTrial(onTestComplete)}
    </BaseTest>
  );
};

// ===== STROOP TEST =====
const StroopTest = ({ onTestComplete }) => {
  const { t } = useTranslation();
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
      { word: 'BLUE', color: 'green', correctAnswer: 'green' },
    ];

    // Randomize order
    return base.sort(() => Math.random() - 0.5);
  }, []);

  const trialTime = 5; // seconds per trial
  const feedbackTime = 2; // seconds to show feedback

  const instructions = (
    <div className="space-y-4">
      <p>
        {t('testContent.stroop.measures')} <strong>{t('testContent.stroop.attentionControl')}</strong>{t('testContent.stroop.measures2')}
      </p>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">{t('testContent.stroop.instructionTitle')}</h3>
        <p className="text-blue-700">
          <strong>{t('testContent.stroop.ignoreWord')}</strong> {t('testContent.stroop.identifyColor')} <strong>{t('testContent.stroop.colorOfText')}</strong>.
        </p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">{t('testContent.stroop.exampleTitle')}</h3>
        <div className="space-y-2">
          <div className="text-center p-3 bg-white rounded border">
            <span style={{ color: 'blue' }} className="text-2xl font-bold">RED</span>
            <p className="text-sm text-gray-600 mt-1">{t('testContent.stroop.exampleAnswer')}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-semibold text-green-800 mb-2">{t('testContent.stroop.whatToDoTitle')}</h3>
        <ul className="list-disc list-inside space-y-1 text-green-700">
          <li>{t('testContent.stroop.lookAtColor')}</li>
          <li>{t('testContent.stroop.clickCorrectColor')}</li>
          <li>{t('testContent.stroop.youHaveSeconds', { seconds: trialTime })}</li>
          <li>{t('testContent.stroop.completeAllTrials', { total: trials.length })}</li>
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

  const handleColorSelect = (selectedColor, onTestComplete) => {
    const currentTrialData = trials[currentTrial];
    const isCorrect = selectedColor === currentTrialData.correctAnswer;
    const rt = trialStartTs ? (Date.now() - trialStartTs) / 1000 : null;
    if (rt !== null) setResponseTimes(prev => [...prev, rt]);
    
    setUserAnswer(selectedColor);
    setFeedback({
      correct: isCorrect,
      message: isCorrect ? t('testContent.correct') : t('testContent.incorrectColor', { color: currentTrialData.correctAnswer })
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
        const accuracyPercent = basePercent;
        const finalPercent = Math.max(0, Math.min(100, basePercent - penalty));
        const finalScore = Number(((finalPercent / 100) * 10).toFixed(2));
        if (onTestComplete) {
          onTestComplete({
            finalScore,
            metadata: {
              totalTrials: total,
              correctResponses: correct,
              avgResponseTimeSeconds: avgRT,
              penaltyPercent: penalty,
              accuracyPercent,
              finalPercent,
            }
          });
        }
      }
    }, feedbackTime * 1000);
  };

  // Store onTestComplete in a ref so timer effect can access it
  const onTestCompleteRef = useRef(null);
  
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
            message: t('testContent.timesUpColor', { color: trials[currentTrial].correctAnswer })
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
              const accuracyPercent = basePercent;
              const finalPercent = Math.max(0, Math.min(100, basePercent - penalty));
              const finalScore = Number(((finalPercent / 100) * 10).toFixed(2));
              if (onTestCompleteRef.current) {
                onTestCompleteRef.current({
                  finalScore,
                  metadata: {
                    totalTrials: total,
                    correctResponses: correct,
                    avgResponseTimeSeconds: avgRT,
                    penaltyPercent: penalty,
                    accuracyPercent,
                    finalPercent,
                  }
                });
              }
            }
          }, feedbackTime * 1000);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrial, timeLeft, showFeedback, trials, correctCount, responseTimes, trialTime, feedbackTime]);

  // Initialize first trial
  useEffect(() => {
    if (currentTrial === 0 && timeLeft === 0) {
      setTimeLeft(trialTime);
      setTrialStartTs(Date.now());
    }
  }, [currentTrial, timeLeft, trialTime]);

  const renderTrial = (onTestComplete) => {
    if (currentTrial >= trials.length) return null;
    
    // Update ref when onTestComplete changes
    onTestCompleteRef.current = onTestComplete;
    
    const trial = trials[currentTrial];
    
    return (
      <div className="text-center">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            {t('testContent.trialOf', { current: currentTrial + 1, total: trials.length })}
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
            {t('testContent.whatColorIsText')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color, onTestComplete)}
              disabled={showFeedback}
              className={`btn btn-lg py-4 text-lg font-semibold capitalize transition-all ${
                showFeedback && userAnswer === color
                  ? feedback.correct
                    ? 'btn-success'
                    : 'btn-danger'
                  : 'btn-outline hover:btn-primary'
              }`}
            >
              {t(`testContent.colors.${color}`)}
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
      {({ onTestComplete }) => renderTrial(onTestComplete)}
    </BaseTest>
  );
};

// ===== WORD RECALL TEST =====
const WordRecallTest = ({ onTestComplete }) => {
  const { t } = useTranslation();
  // Phases: study1 → recall1 → between → study2 → recall2
  const [currentPhase, setCurrentPhase] = useState('study1');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [round1Inputs, setRound1Inputs] = useState([]);
  const [round2Inputs, setRound2Inputs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  // Test configuration
  const allWords = useMemo(() => [
    'apple', 'river', 'mountain', 'ocean', 'forest',
    'sunset', 'bridge', 'garden', 'castle', 'star'
  ], []);

  const round1Words = useMemo(() => allWords.slice(0, 5), [allWords]);
  const round2Words = useMemo(() => allWords.slice(5), [allWords]);

  const studyTime = 3;   // seconds per word
  const betweenTime = 5; // seconds between rounds

  const instructions = (
    <div className="space-y-4">
      <p>
        {t('testContent.wordRecall.measures')} <strong>{t('testContent.wordRecall.memoryRecall')}</strong>{t('testContent.wordRecall.measures2')}
      </p>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">{t('testContent.wordRecall.structureTitle')}</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li><strong>Round 1:</strong> Study 5 words → Recall them</li>
          <li><strong>5 second break</strong> before Round 2</li>
          <li><strong>Round 2:</strong> Study 5 new words → Recall them</li>
          <li>Combined score from both rounds</li>
        </ol>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">{t('testContent.wordRecall.tipsTitle')}</h3>
        <ul className="list-disc list-inside space-y-1 text-yellow-700">
          <li>{t('testContent.wordRecall.tip1')}</li>
          <li>{t('testContent.wordRecall.tip2')}</li>
          <li>{t('testContent.wordRecall.tip3')}</li>
        </ul>
      </div>
    </div>
  );

  // ---- Phase transitions ----
  const startRecall1 = useCallback(() => {
    setCurrentPhase('recall1');
    setRound1Inputs(new Array(5).fill(''));
  }, []);

  const startBetween = useCallback(() => {
    setCurrentPhase('between');
    setTimeLeft(betweenTime);
  }, []);

  const startStudy2 = useCallback(() => {
    setCurrentPhase('study2');
    setCurrentWordIndex(0);
    setTimeLeft(studyTime);
  }, [studyTime]);

  const startRecall2 = useCallback(() => {
    setCurrentPhase('recall2');
    setRound2Inputs(new Array(5).fill(''));
  }, []);

  // ---- Input handlers ----
  const handleRound1Input = (index, value) => {
    const next = [...round1Inputs];
    next[index] = value;
    setRound1Inputs(next);
  };

  const handleRound2Input = (index, value) => {
    const next = [...round2Inputs];
    next[index] = value;
    setRound2Inputs(next);
  };

  // ---- Scoring ----
  const matchWords = (inputs, targetWords) => {
    const correct = targetWords.map(w => w.toLowerCase());
    const recalled = inputs.map(i => i.trim().toLowerCase()).filter(Boolean);
    const matched = new Set();
    for (const rec of recalled) {
      for (const cor of correct) {
        if (rec === cor || rec.startsWith(cor.slice(0, 3)) || cor.startsWith(rec.slice(0, 3))) {
          matched.add(cor);
          break;
        }
      }
    }
    return matched.size;
  };

  const handleFinalSubmit = (onTestComplete) => {
    const r1Correct = matchWords(round1Inputs, round1Words);
    const r2Correct = matchWords(round2Inputs, round2Words);
    const totalCorrect = r1Correct + r2Correct;
    const score = Number(((totalCorrect / allWords.length) * 10).toFixed(2));

    console.log('✅ HVLT-R Done:', { r1Correct, r2Correct, totalCorrect, score });

    if (onTestComplete) {
      onTestComplete({
        finalScore: score,
        metadata: {
          totalTrials: allWords.length,
          correctResponses: totalCorrect,
          round1Correct: r1Correct,
          round2Correct: r2Correct,
        }
      });
    }
  };

  // ---- Study phase timer ----
  useEffect(() => {
    if ((currentPhase === 'study1' || currentPhase === 'study2') && timeLeft > 0) {
      const timer = setTimeout(() => {
        if (timeLeft > 1) {
          setTimeLeft(prev => prev - 1);
        } else {
          // Move to next word or end round
          const roundWords = currentPhase === 'study1' ? round1Words : round2Words;
          if (currentWordIndex < roundWords.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
            setTimeLeft(studyTime);
          } else {
            if (currentPhase === 'study1') startRecall1();
            else startRecall2();
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, currentWordIndex, timeLeft]);

  // ---- Between-rounds countdown ----
  useEffect(() => {
    if (currentPhase === 'between' && timeLeft > 0) {
      const timer = setTimeout(() => {
        if (timeLeft > 1) setTimeLeft(prev => prev - 1);
        else startStudy2();
      }, 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, timeLeft]);

  // ---- Init first word ----
  useEffect(() => {
    if ((currentPhase === 'study1') && currentWordIndex === 0 && timeLeft === 0) {
      setTimeLeft(studyTime);
    }
  }, [currentPhase, currentWordIndex, timeLeft, studyTime]);

  // ---- Render helpers ----
  const renderStudyPhase = (round) => {
    const roundWords = round === 1 ? round1Words : round2Words;
    return (
      <div className="text-center">
        {/* Round badge */}
        <div className="inline-flex items-center px-4 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold mb-6">
          Round {round} of 2 — Word {currentWordIndex + 1} of {roundWords.length}
        </div>

        <div className="mb-4 text-2xl text-gray-600">
          <Clock className="inline-block w-6 h-6 mr-2" />
          {timeLeft}s
        </div>

        <div className="text-7xl font-bold text-blue-600 mb-8 animate-pulse tracking-widest">
          {roundWords[currentWordIndex]}
        </div>

        <div className="text-gray-500 text-sm">{t('testContent.memorizeWord')}</div>
      </div>
    );
  };

  const renderRecallPhase = (round, inputs, handleInput, onSubmit) => (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center px-4 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-4">
          Round {round} Recall
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          {t('testContent.recallTheWords')}
        </h3>
        <p className="text-gray-500 text-sm">
          {round === 1
            ? 'Type the 5 words from Round 1 that you remember.'
            : 'Type the 5 words from Round 2 that you remember.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {t('testContent.wordLabel', { number: index + 1 })}
            </label>
            <input
              type="text"
              value={inputs[index] || ''}
              onChange={(e) => handleInput(index, e.target.value)}
              className="input w-full"
              placeholder={t('testContent.typeWordRemember')}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onSubmit}
          className="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold"
        >
          {round === 1 ? '✅ Submit Round 1 & Continue' : t('testContent.completeRecall')}
        </button>
      </div>
    </div>
  );

  const renderBetweenRounds = () => (
    <div className="text-center">
      <div className="inline-flex items-center px-4 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-semibold mb-6">
        Get Ready for Round 2
      </div>
      <Brain className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
      <h3 className="text-2xl font-semibold text-gray-900 mb-4">Round 2 starts in...</h3>
      <div className="text-6xl font-bold text-purple-600 mb-4">{timeLeft}</div>
      <p className="text-gray-500 text-sm">5 new words are coming. Stay focused!</p>
    </div>
  );

  return (
    <BaseTest
      testType="word_recall"
      testName="Hopkins Verbal Learning Test–Revised (HVLT-R)"
      instructions={instructions}
      maxScore={10}
      timeLimit={Math.ceil((allWords.length * studyTime + betweenTime) / 60)}
    >
      {({ onTestComplete }) => (
        <>
          {currentPhase === 'study1' && renderStudyPhase(1)}
          {currentPhase === 'recall1' && renderRecallPhase(
            1, round1Inputs, handleRound1Input, startBetween
          )}
          {currentPhase === 'between' && renderBetweenRounds()}
          {currentPhase === 'study2' && renderStudyPhase(2)}
          {currentPhase === 'recall2' && renderRecallPhase(
            2, round2Inputs, handleRound2Input, () => handleFinalSubmit(onTestComplete)
          )}
        </>
      )}
    </BaseTest>
  );
};

// ===== TEST SCHEDULER =====
const TestScheduler = () => {
  const { t } = useTranslation();
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
    { value: 'daily', label: t('testContent.scheduler.daily'), description: t('testContent.scheduler.everyDay') },
    { value: 'weekly', label: t('testContent.scheduler.weekly'), description: t('testContent.scheduler.onceAWeek') },
    { value: 'bi_weekly', label: t('testContent.scheduler.biWeekly'), description: t('testContent.scheduler.everyTwoWeeks') },
    { value: 'monthly', label: t('testContent.scheduler.monthly'), description: t('testContent.scheduler.onceAMonth') }
  ];

  useEffect(() => {
    fetchSchedules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/users/test-schedule');
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error(t('testContent.scheduler.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.test_type || !formData.scheduled_date) {
      toast.error(t('testContent.scheduler.fillRequired'));
      return;
    }

    try {
      if (editingSchedule) {
        await api.put(`/users/test-schedule/${editingSchedule.id}`, formData);
        toast.success(t('testContent.scheduler.updateSuccess'));
      } else {
        await api.post('/users/schedule-test', formData);
        toast.success(t('testContent.scheduler.scheduleSuccess'));
      }
      
      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(t('testContent.scheduler.failedSave'));
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
    if (window.confirm(t('testContent.scheduler.deleteConfirm'))) {
      try {
        await api.delete(`/users/test-schedule/${scheduleId}`);
        toast.success(t('testContent.scheduler.deleteSuccess'));
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.error(t('testContent.scheduler.failedDelete'));
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
          <p className="text-gray-600">{t('testContent.scheduler.loadingSchedules')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
          {t('testContent.scheduler.title')}
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
          {t('testContent.scheduler.addSchedule')}
        </button>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <div className="bg-white rounded-3xl p-8 shadow-soft animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-display font-bold text-gray-900">
              {editingSchedule ? t('testContent.scheduler.editSchedule') : t('testContent.scheduler.scheduleTest')}
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
                  {t('testContent.scheduler.testType')} *
                </label>
                <select
                  value={formData.test_type}
                  onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                  required
                >
                  <option value="">{t('testContent.scheduler.selectTest')}</option>
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
                  {t('testContent.scheduler.frequency')}
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
                  {t('testContent.scheduler.scheduledDate')} *
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
                  {t('testContent.scheduler.scheduledTime')}
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
                {t('testContent.scheduler.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
                placeholder={t('testContent.scheduler.notesPlaceholder')}
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
                {t('testContent.scheduler.cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-medium rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
              >
                {editingSchedule ? t('testContent.scheduler.editSchedule') : t('testContent.scheduler.saveSchedule')}
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
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('testContent.scheduler.noSchedules')}</h4>
            <p className="text-gray-500 mb-4">
              {t('testContent.scheduler.scheduleFirst')}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('testContent.scheduler.addSchedule')}
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
