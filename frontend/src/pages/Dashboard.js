import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Plus,
  ArrowRight,
  Activity,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    user_profile: { name: '', age: 0, gender: '' },
    risk_assessment: null,
    test_summary: { total_tests: 0, average_performance: 0, last_test_date: null },
    recent_tests: [],
    next_scheduled_test: null,
    last_updated: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/users/dashboard');
      console.log('Dashboard response:', response.data);
      if (response.data && response.data.dashboard) {
        setDashboardData(response.data.dashboard);
      } else {
        console.error('Invalid dashboard data structure:', response.data);
        setDashboardData({
          user_profile: { name: '', age: 0, gender: '' },
          risk_assessment: null,
          test_summary: { total_tests: 0, average_performance: 0, last_test_date: null },
          recent_tests: [],
          next_scheduled_test: null,
          last_updated: null
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default data on error
      setDashboardData({
        user_profile: { name: '', age: 0, gender: '' },
        risk_assessment: null,
        test_summary: { total_tests: 0, average_performance: 0, last_test_date: null },
        recent_tests: [],
        next_scheduled_test: null,
        last_updated: null
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'success';
      case 'moderate': return 'warning';
      case 'high': return 'danger';
      default: return 'gray';
    }
  };

  const getRiskIcon = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'moderate': return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-danger-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Welcome back, {dashboardData.user_profile?.name || user?.first_name || 'User'}! 👋
          </h1>
          <p className="text-xl text-gray-600">
            Here's your cognitive health overview for today
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/tests"
            className="group bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-l-primary-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors duration-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Take a Test</h3>
            <p className="text-gray-600 text-sm">Complete your scheduled cognitive assessment</p>
          </Link>

          <Link
            to="/risk-evaluation"
            className="group bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-l-secondary-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary-100 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-secondary-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-secondary-600 transition-colors duration-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Assessment</h3>
            <p className="text-gray-600 text-sm">Evaluate your dementia risk factors</p>
          </Link>

          <Link
            to="/reports"
            className="group bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-l-accent-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-accent-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-accent-600 transition-colors duration-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View Reports</h3>
            <p className="text-gray-600 text-sm">Check your detailed performance reports</p>
          </Link>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Overview */}
            <div className="bg-white rounded-3xl p-8 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">Performance Overview</h2>
                <Link to="/reports" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                  View Full Report →
                </Link>
              </div>
              
              {dashboardData.recent_tests && dashboardData.recent_tests.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.recent_tests.map(test => ({
                      date: new Date(test.completed_at).toLocaleDateString(),
                      score: test.percentage
                    }))}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: 'none', 
                          borderRadius: '12px', 
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' 
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#0ea5e9" 
                        strokeWidth={3}
                        fill="url(#colorScore)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No performance data yet</p>
                  <p className="text-gray-400 text-sm">Complete your first test to see your progress</p>
                </div>
              )}
            </div>

            {/* Recent Tests */}
            <div className="bg-white rounded-3xl p-8 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">Recent Tests</h2>
                <Link to="/tests" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                  View All →
                </Link>
              </div>
              
              {dashboardData.recent_tests && dashboardData.recent_tests.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recent_tests.slice(0, 3).map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                          <Brain className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {test.test_type.replace('_', ' ')} Test
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(test.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                          {test.percentage}%
                        </div>
                        <div className="text-sm text-gray-500">Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No tests completed yet</p>
                  <Link 
                    to="/tests" 
                    className="inline-flex items-center mt-3 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Take Your First Test →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Risk Score Card */}
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                {getRiskIcon(dashboardData.risk_assessment?.category)}
              </div>
              
              {dashboardData.risk_assessment ? (
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-2 text-${getRiskColor(dashboardData.risk_assessment.category)}-600`}>
                    {dashboardData.risk_assessment.category}
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Risk Score: {dashboardData.risk_assessment.score || 'N/A'}
                  </div>
                  <Link 
                    to="/risk-evaluation" 
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">No risk assessment yet</p>
                  <Link 
                    to="/risk-evaluation" 
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Get Assessed →
                  </Link>
                </div>
              )}
            </div>

            {/* Next Scheduled Test */}
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Next Test</h3>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              
              {dashboardData.next_scheduled_test ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 capitalize">
                    {dashboardData.next_scheduled_test.test_type.replace('_', ' ')} Test
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    {new Date(dashboardData.next_scheduled_test.scheduled_date).toLocaleDateString()}
                  </p>
                  <Link 
                    to="/tests" 
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors duration-300"
                  >
                    Start Test
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">No upcoming tests</p>
                  <Link 
                    to="/tests" 
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Schedule Test →
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tests Completed</span>
                  <span className="font-semibold text-gray-900">{dashboardData.test_summary.total_tests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-semibold text-gray-900">
                    {dashboardData.test_summary.average_performance || 'N/A'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Streak</span>
                  <span className="font-semibold text-gray-900">0 days</span>
                </div>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-3xl p-6 text-white">
              <Award className="w-8 h-8 mb-3 opacity-80" />
              <p className="text-sm leading-relaxed">
                "The brain is like a muscle. The more you exercise it, the stronger it becomes."
              </p>
              <p className="text-xs opacity-80 mt-2">- Unknown</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
