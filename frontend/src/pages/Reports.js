import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  User,
  BarChart3
} from 'lucide-react';
import { generateFullReportPDF } from '../utils/generateFullReport';
import { generateClinicReport } from '../utils/generateClinicReport';
import { generateComprehensivePDFReport } from '../utils/generateComprehensiveReport';

const Reports = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [results, setResults] = useState([]);
  const [filter, setFilter] = useState('All');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const chartRef = useRef(null);
  const reportRef = useRef(null);

  useEffect(() => {
    // Fetch data when component mounts
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch data in parallel - use same endpoint as Dashboard
      const [dashboardRes, resultsRes] = await Promise.all([
        api.get('/users/dashboard').catch(err => {
          console.error('Dashboard fetch error:', err);
          return { data: { dashboard: null } };
        }),
        api.get('/api/results', {
          params: { limit: 100 }
        }).catch(err => {
          console.error('Results fetch error:', err);
          return { data: { results: [] } };
        })
      ]);

      // Set dashboard data
      const dashboard = dashboardRes.data?.dashboard;
      if (dashboard) {
        setDashboardData(dashboard);
      } else {
        // If dashboard is null, set empty structure
        setDashboardData({
          user_profile: { name: '', age: 0, gender: '' },
          risk_assessment: null,
          test_summary: { total_tests: 0, average_performance: 0, last_test_date: null },
          recent_tests: [],
          next_scheduled_test: null,
          last_updated: null
        });
      }

      // Set results
      const testResults = resultsRes.data?.results || [];
      setResults(testResults);

      // Log for debugging
      console.log('Fetched data:', { 
        dashboard: dashboard ? 'loaded' : 'null', 
        resultsCount: testResults.length 
      });

    } catch (error) {
      console.error('❌ Failed to fetch report data:', error);
      toast.error('Unable to load report data.');
      // Set empty data structure on error
      setDashboardData({
        user_profile: { name: '', age: 0, gender: '' },
        risk_assessment: null,
        test_summary: { total_tests: 0, average_performance: 0, last_test_date: null },
        recent_tests: [],
        next_scheduled_test: null,
        last_updated: null
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter results by test type
  const filteredResults = filter === 'All' 
    ? results 
    : results.filter(r => {
        const testType = r.test_type?.toLowerCase() || '';
        if (filter === 'Memory') {
          return testType.includes('word') || testType.includes('recall') || testType.includes('memory');
        }
        if (filter === 'Attention') {
          return testType.includes('stroop') || testType.includes('attention');
        }
        if (filter === 'Reasoning') {
          return testType.includes('pattern') || testType.includes('reasoning');
        }
        return true;
      });

  // Prepare chart data
  const chartData = filteredResults
    .map(result => ({
      date: new Date(result.completed_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      score: result.percentage || (result.score / result.max_score) * 100,
      testType: result.test_type
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate average performance
  const averagePerformance = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || (r.score / r.max_score) * 100), 0) / results.length)
    : 0;

  // Get risk badge color classes
  const getRiskBadgeClasses = (category) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    const cat = category.toLowerCase();
    if (cat === 'low') return 'bg-green-100 text-green-800';
    if (cat === 'moderate') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Generate full cognitive test report
  const handleDownloadReport = async () => {
    if (!user && !dashboardData?.user_profile) {
      toast.error('No user data available');
      return;
    }

    if (!results.length) {
      toast.error('No test data available');
      return;
    }

    try {
      setGeneratingPDF(true);
      toast.loading('Generating full report...', { id: 'full-report' });

      // Prepare user data
      const userData = user || dashboardData?.user_profile || {};
      
      // Prepare risk data
      const riskData = dashboardData?.risk_assessment || null;

      await generateFullReportPDF({
        user: userData,
        tests: results,
        risk: riskData,
        chartRef: chartRef
      });

      toast.success('Full report generated successfully!', { id: 'full-report' });
    } catch (error) {
      console.error('Error generating full report:', error);
      toast.error('Failed to generate full report', { id: 'full-report' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generate clinic assessment report
  const handleClinicPDF = () => {
    const userData = user || dashboardData?.user_profile || {};
    
    if (!userData || !results.length) {
      toast.error('No data to generate report.');
      return;
    }

    try {
      generateClinicReport({ 
        user: userData, 
        tests: results 
      });
      toast.success('Clinic report generated successfully!');
    } catch (error) {
      console.error('Error generating clinic report:', error);
      toast.error('Failed to generate clinic report');
    }
  };

  // Generate comprehensive dementia assessment report
  const handleGenerateComprehensiveReport = () => {
    const userData = user || dashboardData?.user_profile || {};
    
    console.log('Generating report with:', { userData, resultsCount: results.length, results });
    
    if (!userData) {
      toast.error('No user data available.');
      return;
    }

    if (!results || results.length === 0) {
      toast.error('No test data found. Complete at least one test.');
      return;
    }

    try {
      // Ensure we have all test results
      const allTestResults = results.map(test => ({
        test_type: test.test_type || test.testName || 'Unknown Test',
        testName: test.test_type || test.testName || 'Unknown Test',
        score: Number(test.score) || 0,
        max_score: Number(test.max_score) || 10,
        completed_at: test.completed_at || test.completionDate || new Date(),
        percentage: test.percentage || Math.round((test.score / test.max_score) * 100)
      }));

      console.log('Processed test results:', allTestResults);

      generateComprehensivePDFReport(userData, allTestResults, {
        clinicName: "Dementia Tracker Cognitive Center"
      });
      
      toast.success('Comprehensive report generated successfully!');
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      toast.error(error.message || 'Failed to generate comprehensive report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  // Show error state only if we have an actual error, not just empty data
  if (!dashboardData || !dashboardData.user_profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load report data</p>
          <button
            onClick={fetchAllData}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const userProfile = dashboardData.user_profile || {};
  const riskAssessment = dashboardData.risk_assessment || {};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Cognitive Health Report</h1>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleGenerateComprehensiveReport}
              disabled={results.length === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              🧾 Generate Dementia Assessment Report
            </button>
            <button
              onClick={handleClinicPDF}
              disabled={results.length === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              📋 Download Clinic Report
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={generatingPDF || results.length === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  📥 Download Full Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hidden report content for PDF */}
        <div ref={reportRef} className="hidden">
          <div className="bg-white p-8">
            <h1 className="text-2xl font-bold mb-4">Dementia Tracker — Cognitive Health Report</h1>
            <div className="mb-6">
              <p><strong>Name:</strong> {userProfile.name}</p>
              <p><strong>Age:</strong> {userProfile.age}</p>
              <p><strong>Gender:</strong> {userProfile.gender}</p>
            </div>
            <div className="mb-6">
              <p><strong>Total Tests:</strong> {results.length}</p>
              <p><strong>Average Performance:</strong> {averagePerformance}%</p>
              <p><strong>Current Risk:</strong> {riskAssessment.category || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-primary-600" />
              <h3 className="text-sm font-medium text-gray-500">User Profile</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{userProfile.name || 'N/A'}</p>
            <p className="text-sm text-gray-600 mt-1">
              {userProfile.age} years • {userProfile.gender}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <h3 className="text-sm font-medium text-gray-500">Total Tests</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{results.length}</p>
            <p className="text-sm text-gray-600 mt-1">Tests completed</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="text-sm font-medium text-gray-500">Average Performance</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{averagePerformance}%</p>
            <p className="text-sm text-gray-600 mt-1">Overall score</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-primary-600" />
              <h3 className="text-sm font-medium text-gray-500">Current Risk</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {riskAssessment.category || 'N/A'}
            </p>
            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getRiskBadgeClasses(riskAssessment.category)}`}>
              {riskAssessment.score ? `${riskAssessment.score}%` : 'Not assessed'}
            </span>
          </div>
        </div>

        {/* Performance Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Performance Trend</h2>
            <div className="flex gap-2">
              {['All', 'Memory', 'Attention', 'Reasoning'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div ref={chartRef} className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#4F46E5" 
                    strokeWidth={2}
                    name="Performance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for chart
              </div>
            )}
          </div>
        </div>

        {/* Detailed Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Detailed Test Results</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score (/10)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Risk (%)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => {
                    const estRisk = Math.round((1 - (result.score / result.max_score)) * 100);
                    return (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.test_type || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.score}/{result.max_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.percentage || Math.round((result.score / result.max_score) * 100)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${
                            estRisk < 20 ? 'text-green-600' :
                            estRisk < 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {estRisk}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No test results available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
