import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  RefreshCw,
  Home
} from 'lucide-react';

const TestResults = ({ 
  testResult, 
  onRetake, 
  onViewHistory,
  onSave,
  onReturnWithoutSaving,
  saving = false,
  riskData,
  testName,
  maxScore = 10 
}) => {
  const navigate = useNavigate();

  if (!testResult || testResult.score === undefined || testResult.score === null) {
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
    completed_at,
    performance_level,
    performance_feedback,
    next_steps,
    metadata
  } = testResult || {};
  
  // Calculate percentage if not provided
  const percentage = (rawPercentage !== undefined && rawPercentage !== null) ? rawPercentage : (score !== undefined && testResult.max_score ? Math.round((score / testResult.max_score) * 100) : 0);

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
              <p className="text-lg text-gray-600 mb-1">{getScoreMessage(percentage)}</p>
              {performance_level && (
                <p className="text-sm text-gray-500">Performance Level: <span className="font-semibold">{performance_level}</span></p>
              )}
              <div className="inline-block px-4 py-2 bg-gray-100 rounded-full mt-3">
                <span className="text-sm font-medium text-gray-700">
                  {performance_feedback?.level || 'Standard'} Performance
                </span>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {riskData && (
                <div className="bg-gradient-to-br from-primary-50 to-secondary-50 p-4 rounded-xl border border-primary-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Estimated dementia risk</h3>
                  <div className="text-3xl font-bold mb-1">
                    <span className={riskData.final_risk >= 50 ? 'text-red-600' : riskData.final_risk >= 20 ? 'text-yellow-600' : 'text-green-600'}>
                      {riskData.final_risk}%
                    </span>
                    <span className="ml-2 text-sm align-middle px-2 py-1 rounded-full bg-gray-100 text-gray-700">{riskData.category}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">This is an estimated risk indicator — not a medical diagnosis. See a clinician for evaluation.</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Test contribution: <span className="font-semibold">{riskData.test_risk}%</span> (avg score {riskData.avgTestScore?.toFixed?.(2) ?? riskData.avgTestScore}/10)</div>
                    <div>Demographics contribution: <span className="font-semibold">{riskData.demo_risk}%</span></div>
                    <div className="text-xs text-gray-500">Weights: tests {Math.round((riskData.weights?.tests||0)*100)}%, demo {Math.round((riskData.weights?.demo||0)*100)}%</div>
                  </div>
                </div>
              )}
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
                      {completed_at ? new Date(completed_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Taken:</span>
                    <span className="font-medium text-gray-900">
                      {time_taken ? `${time_taken}s` : 'N/A'}
                    </span>
                  </div>
                  {metadata && metadata.totalTrials !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Correct / Total:</span>
                      <span className="font-medium text-gray-900">{(metadata.correctResponses || metadata.correctAnswers || 0)} / {metadata.totalTrials}</span>
                    </div>
                  )}
                  {metadata && metadata.avgResponseTimeSeconds !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. Response Time:</span>
                      <span className="font-medium text-gray-900">{Number(metadata.avgResponseTimeSeconds).toFixed(2)}s</span>
                    </div>
                  )}
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
            onClick={onSave}
            disabled={saving}
            className={`flex items-center justify-center space-x-2 px-6 py-4 ${saving ? 'bg-secondary-400' : 'bg-secondary-600 hover:bg-secondary-700'} text-white rounded-xl transition-colors font-medium`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save & Return to Dashboard'}</span>
          </button>

          <button
            onClick={onReturnWithoutSaving || handleViewHistory}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
          >
            <XCircle className="w-5 h-5" />
            <span>Return without Saving</span>
          </button>

          <div className="hidden md:block"></div>

          <button
            onClick={handleRetake}
            className="flex items-center justify-center space-x-2 px-6 py-4 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retry Test</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
