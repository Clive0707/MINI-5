import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Brain, 
  TrendingUp, 
  Calendar, 
  ArrowRight,
  RefreshCw,
  Home,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const TestResults = ({ 
  testResult, 
  onRetake, 
  onViewHistory,
  testName,
  maxScore = 10 
}) => {
  const navigate = useNavigate();

  if (!testResult || !testResult.score) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Test Results</h2>
          <p className="text-gray-600 mb-6">Test results not available or incomplete.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { 
    score, 
    percentage: rawPercentage, 
    time_taken, 
    completion_date,
    performance_feedback,
    next_steps 
  } = testResult || {};
  
  // Calculate percentage if not provided
  const percentage = rawPercentage || (score && testResult.max_score ? Math.round((score / testResult.max_score) * 100) : 0);

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (percentage) => {
    if (percentage >= 80) return <CheckCircle className="w-8 h-8 text-green-600" />;
    if (percentage >= 60) return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    return <XCircle className="w-8 h-8 text-red-600" />;
  };

  const getScoreMessage = (percentage) => {
    if (percentage >= 90) return '🎉 Outstanding performance!';
    if (percentage >= 80) return '👍 Excellent work!';
    if (percentage >= 70) return '👏 Good job!';
    if (percentage >= 60) return '🤔 Fair performance';
    if (percentage >= 50) return '📉 Below average';
    return '😔 Needs improvement';
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      navigate('/tests');
    }
  };

  const handleRetake = () => {
    if (onRetake) {
      onRetake();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Complete! 🧠</h1>
          <p className="text-xl text-gray-600">Here are your results for {testName}</p>
        </div>

        {/* Main Results Card */}
        <div className="bg-white rounded-3xl p-8 shadow-soft mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Score Section */}
            <div className="text-center">
              <div className="mb-6">
                {getScoreIcon(percentage)}
              </div>
              <h2 className="text-6xl font-bold mb-2" style={{ color: getScoreColor(percentage) }}>
                {percentage}%
              </h2>
              <p className="text-2xl font-semibold text-gray-700 mb-2">
                {score}/{maxScore} points
              </p>
              <p className="text-lg text-gray-600 mb-4">
                {getScoreMessage(percentage)}
              </p>
              <div className="inline-block px-4 py-2 bg-gray-100 rounded-full">
                <span className="text-sm font-medium text-gray-700">
                  {performance_feedback?.level || 'Standard'} Performance
                </span>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Test Type:</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {testResult.test_type ? testResult.test_type.replace('_', ' ') : 'Cognitive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Date:</span>
                    <span className="font-medium text-gray-900">
                      {completion_date ? new Date(completion_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Taken:</span>
                    <span className="font-medium text-gray-900">
                      {time_taken ? `${time_taken}s` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performance Level:</span>
                    <span className="font-medium text-gray-900">
                      {performance_feedback?.level || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Feedback */}
              {performance_feedback && performance_feedback.message && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Analysis</h3>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-blue-800 font-medium">
                      {performance_feedback.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {next_steps && Array.isArray(next_steps) && next_steps.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-soft mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Next Steps & Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {next_steps.map((step, index) => (
                <div key={index} className="text-center p-6 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl border border-primary-100">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="text-gray-800 font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            <span>Return to Dashboard</span>
          </button>

          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 transition-colors font-medium"
          >
            <BarChart3 className="w-5 h-5" />
            <span>View Test History</span>
          </button>

          <button
            onClick={handleRetake}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retake Test</span>
          </button>
        </div>

        {/* Success Message */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Test results saved successfully!</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Your results have been integrated into your dashboard and reports.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
