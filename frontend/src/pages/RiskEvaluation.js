import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  FileText, 
  Home,
  Loader2,
  Calculator,
  Download
} from 'lucide-react';
import { generateRiskReportPDF } from '../utils/generateRiskReport';

const RiskEvaluation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  
  const [formData, setFormData] = useState({
    age: user?.age || '',
    gender: user?.gender || 'Male',
    familyHistory: 'No',
    smoking: 'No',
    physicalActivity: 'Medium',
    memoryIssues: 'No',
    selfAssessment: 3
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateRisk = () => {
    const {
      age,
      familyHistory,
      smoking,
      physicalActivity,
      memoryIssues,
      selfAssessment
    } = formData;

    const ageNum = parseInt(age) || 0;
    let riskScore = 0;

    // Age factor
    if (ageNum >= 70) {
      riskScore += 25;
    } else if (ageNum >= 60) {
      riskScore += 15;
    } else {
      riskScore += 5;
    }

    // Family history
    if (familyHistory === 'Yes') {
      riskScore += 20;
    }

    // Smoking
    if (smoking === 'Yes') {
      riskScore += 10;
    }

    // Physical activity
    if (physicalActivity === 'Low') {
      riskScore += 10;
    } else if (physicalActivity === 'Medium') {
      riskScore += 5;
    }

    // Memory issues
    if (memoryIssues === 'Yes') {
      riskScore += 20;
    }

    // Self-assessment
    if (parseInt(selfAssessment) >= 4) {
      riskScore += 10;
    }

    // Clamp between 0 and 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine category
    let category;
    if (riskScore < 20) {
      category = 'Low';
    } else if (riskScore < 50) {
      category = 'Moderate';
    } else {
      category = 'High';
    }

    return { riskScore, category };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.age || parseInt(formData.age) <= 0) {
      toast.error('Please enter a valid age');
      return;
    }

    const result = calculateRisk();
    setRiskResult(result);
    setShowResults(true);
  };

  const handleSaveRisk = async () => {
    if (!riskResult || !user?._id) {
      toast.error('Unable to save risk result');
      return;
    }

    try {
      setLoading(true);
      
      const userId = user?.id || user?._id;
      const payload = {
        userId: userId,
        riskScore: riskResult.riskScore,
        category: riskResult.category,
        contributingFactors: {
          testType: 'questionnaire',
          score: riskResult.riskScore,
          factors: formData
        },
        createdAt: new Date().toISOString()
      };

      await api.post('/api/risk', payload);
      
      toast.success('Risk assessment saved successfully!');
      
      // Optionally refresh dashboard
      try {
        await api.get(`/api/dashboard/${userId}`);
      } catch (err) {
        console.error('Dashboard refresh failed:', err);
      }
    } catch (error) {
      console.error('Error saving risk assessment:', error);
      toast.error(error.response?.data?.error || 'Failed to save risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRiskReport = async () => {
    if (!riskResult || !user) {
      toast.error('Unable to generate report');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Generating risk report...', { id: 'risk-report' });
      
      await generateRiskReportPDF({
        user,
        formData,
        riskScore: riskResult.riskScore,
        category: riskResult.category
      });
      
      toast.success('Risk report generated successfully!', { id: 'risk-report' });
    } catch (error) {
      console.error('Error generating risk report:', error);
      toast.error('Failed to generate risk report', { id: 'risk-report' });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore < 20) return 'text-green-600';
    if (riskScore < 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBgColor = (riskScore) => {
    if (riskScore < 20) return 'bg-green-50 border-green-200';
    if (riskScore < 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getRiskTips = (category) => {
    if (category === 'Low') {
      return 'Maintain healthy habits, regular exercise, balanced diet, and cognitive activities.';
    } else if (category === 'Moderate') {
      return 'Monitor regularly; try lifestyle improvements such as increased physical activity, mental exercises, and regular health checkups.';
    } else {
      return 'Consider clinical evaluation and share this report with your healthcare provider. Focus on lifestyle modifications and medical consultation.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Risk Evaluation</h1>

        {!showResults ? (
          /* Risk Evaluation Form */
        <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Age */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Family History */}
              <div>
                <label htmlFor="familyHistory" className="block text-sm font-medium text-gray-700 mb-2">
                  Family history of dementia
                </label>
                <select
                  id="familyHistory"
                  name="familyHistory"
                  value={formData.familyHistory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Smoking */}
              <div>
                <label htmlFor="smoking" className="block text-sm font-medium text-gray-700 mb-2">
                  Smoking
                </label>
                <select
                  id="smoking"
                  name="smoking"
                  value={formData.smoking}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Physical Activity */}
              <div>
                <label htmlFor="physicalActivity" className="block text-sm font-medium text-gray-700 mb-2">
                  Physical activity level
                </label>
                <select
                  id="physicalActivity"
                  name="physicalActivity"
                  value={formData.physicalActivity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Memory Issues */}
              <div>
                <label htmlFor="memoryIssues" className="block text-sm font-medium text-gray-700 mb-2">
                  Memory issues recently noticed?
                </label>
                <select
                  id="memoryIssues"
                  name="memoryIssues"
                  value={formData.memoryIssues}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {/* Self-Assessment */}
              <div>
                <label htmlFor="selfAssessment" className="block text-sm font-medium text-gray-700 mb-2">
                  Self-assessment: Trouble in focusing/remembering/planning (1-5)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    id="selfAssessment"
                    name="selfAssessment"
                    min="1"
                    max="5"
                    value={formData.selfAssessment}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-primary-600 w-8 text-center">
                    {formData.selfAssessment}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 - No trouble</span>
                  <span>5 - Significant trouble</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Calculate Risk Score
              </button>
            </form>
          </div>
        ) : (
          /* Results Panel */
          <div className="space-y-6">
            <div className={`bg-white shadow rounded-lg p-8 border-2 ${getRiskBgColor(riskResult.riskScore)}`}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Risk Assessment Result</h2>
                <div className="mb-4">
                  <div className={`text-6xl font-bold ${getRiskColor(riskResult.riskScore)}`}>
                    {riskResult.riskScore}%
                  </div>
                  <div className="mt-2">
                    <span className={`inline-block px-4 py-2 rounded-full text-lg font-semibold ${
                      riskResult.category === 'Low' ? 'bg-green-100 text-green-800' :
                      riskResult.category === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {riskResult.category} Risk
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
                <p className="text-gray-700 leading-relaxed">
                  {getRiskTips(riskResult.category)}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSaveRisk}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Save Risk Result
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadRiskReport}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      📄 Download Risk Report
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate('/reports')}
                  className="flex-1 px-4 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  View Full Reports
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Option to retake */}
            <div className="text-center">
              <button
                onClick={() => {
                  setShowResults(false);
                  setRiskResult(null);
                }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Retake Evaluation
              </button>
            </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default RiskEvaluation;
