import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  ArrowRight,
  Activity,
  Target,
  Award,
  RefreshCw,
  BellRing,
  X,
  Download,
  FileText,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import notificationService from '../services/notificationService';
import toast from 'react-hot-toast';
import { generateDashboardReport } from '../utils/generateDashboardReport';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState({
    user_profile: { name: '', age: 0, gender: '' },
    risk_assessment: null,
    test_summary: { total_tests: 0, average_performance: 0, last_test_date: null },
    recent_tests: [],
    next_scheduled_test: null,
    last_updated: null
  });
  const [loading, setLoading] = useState(true);

  // Daily Reminders State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({ email: user?.email || '', time: '09:00' });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderMessage, setReminderMessage] = useState({ text: '', type: '' });
  const [existingReminders, setExistingReminders] = useState([]);

  // Reports Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportTests, setReportTests] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchReminders = async () => {
    try {
      const resp = await api.get('/reminders');
      setExistingReminders(resp.data?.reminders || []);
    } catch (e) {
      console.error('Failed to fetch reminders:', e);
    }
  };

  const handleOpenReminderModal = () => {
    setShowReminderModal(true);
    fetchReminders();
    setReminderMessage({ text: '', type: '' });
  };

  const handleOpenReportModal = async () => {
    setShowReportModal(true);
    setReportLoading(true);
    try {
      const res = await api.get('/results', { params: { limit: 100 } });
      setReportTests(res.data?.results || []);
    } catch (e) {
      console.error('Failed to fetch test results for report:', e);
      setReportTests([]);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadDashboardReport = async () => {
    setReportGenerating(true);
    const toastId = toast.loading('Preparing your report...');
    try {
      await generateDashboardReport({
        user: { ...user, ...dashboardData.user_profile },
        tests: reportTests,
        risk: dashboardData.risk_assessment,
      });
      toast.success('Report downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('Report generation failed:', err);
      toast.error('Failed to generate PDF. Check console for details.', { id: toastId });
    } finally {
      setReportGenerating(false);
    }
  };

  // Helpers for risk display
  const getRiskBand = (riskAssessment) => {
    const cat = (riskAssessment?.category || '').toLowerCase();
    if (cat === 'low')      return { label: 'Low Risk',      color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-300',  bar: 0 };
    if (cat === 'moderate') return { label: 'Moderate Risk', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', bar: 1 };
    if (cat === 'high')     return { label: 'High Risk',     color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-400',    bar: 2 };
    return null;
  };

  const handleDeleteReminder = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      setReminderMessage({ text: 'Reminder cancelled successfully', type: 'success' });
      await fetchReminders();
    } catch (e) {
      setReminderMessage({ text: 'Failed to cancel reminder', type: 'error' });
    }
  };

  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    setReminderLoading(true);
    setReminderMessage({ text: '', type: '' });
    try {
      const payload = {
        email: reminderForm.email,
        time: reminderForm.time,
        userId: user?.userId || user?.id || null
      };
      const response = await api.post('/reminders', payload);
      setReminderMessage({ text: response.data?.message || 'Reminder scheduled successfully', type: 'success' });
      await fetchReminders();
      setTimeout(() => {
        setShowReminderModal(false);
        setReminderMessage({ text: '', type: '' });
      }, 2500);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to schedule reminder';
      setReminderMessage({ text: errorMsg, type: 'error' });
    } finally {
      setReminderLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh dashboard when component becomes visible (e.g., returning from test)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Subscribe to notifications for dashboard refresh
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((type, message, data) => {
      try {
        if (type === 'DASHBOARD_REFRESH' || type === 'TEST_COMPLETED') {
          console.log('🔄 Dashboard refresh triggered by notification:', type, data);
          fetchDashboardData();
        }
      } catch (error) {
        console.error('Error handling notification:', error);
      }
    });

    return unsubscribe;
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/users/dashboard');
      console.log('Dashboard response:', response.data);
      
      if (response.data && response.data.dashboard) {
        // Validate and sanitize dashboard data
        const dashboard = response.data.dashboard;
        const sanitizedData = {
          user_profile: dashboard.user_profile || { name: '', age: 0, gender: '' },
          risk_assessment: dashboard.risk_assessment || null,
          test_summary: dashboard.test_summary || { total_tests: 0, average_performance: 0, last_test_date: null },
          recent_tests: Array.isArray(dashboard.recent_tests) ? dashboard.recent_tests : [],
          next_scheduled_test: dashboard.next_scheduled_test || null,
          last_updated: dashboard.last_updated || null
        };
        
        // Ensure recent_tests have percentage calculated
        sanitizedData.recent_tests = sanitizedData.recent_tests.map(test => ({
          ...test,
          percentage: test.percentage || Math.round((test.score / test.max_score) * 100)
        }));
        
        setDashboardData(sanitizedData);
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
          <p className="text-gray-600">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
              {t('dashboard.welcomeBack', { name: dashboardData.user_profile?.name || user?.first_name || 'User' })} 👋
            </h1>
            <p className="text-xl text-gray-600">
              {t('dashboard.cognitiveOverview')}
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('dashboard.refresh')}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.takeATest')}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.takeTestDesc')}</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.riskAssessment')}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.riskAssessmentDesc')}</p>
          </Link>

          <button
            onClick={handleOpenReportModal}
            className="text-left group bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-l-accent-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent-100 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-accent-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-accent-600 transition-colors duration-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.viewReports')}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.viewReportsDesc')}</p>
          </button>

          <button
            onClick={handleOpenReminderModal}
            className="text-left group bg-white rounded-3xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-l-blue-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <BellRing className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.scheduleReminders')}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.scheduleRemindersDesc')}</p>
          </button>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Overview */}
            <div className="bg-white rounded-3xl p-8 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">{t('dashboard.performanceOverview')}</h2>
                <Link to="/reports" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                  {t('dashboard.viewFullReport')}
                </Link>
              </div>
              
              {dashboardData.recent_tests && dashboardData.recent_tests.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dashboardData.recent_tests.map(test => ({
                      date: test.completed_at ? new Date(test.completed_at).toLocaleDateString() : 'Unknown',
                      score: test.percentage || 0
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
                  <p className="text-gray-500">{t('dashboard.noPerformanceData')}</p>
                  <p className="text-gray-400 text-sm">{t('dashboard.completeFirstTest')}</p>
                </div>
              )}
            </div>

            {/* Recent Tests */}
            <div className="bg-white rounded-3xl p-8 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">{t('dashboard.recentTests')}</h2>
                <Link to="/tests" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                  {t('dashboard.viewAll')}
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
                            {test.test_type ? test.test_type.replace('_', ' ') : 'Cognitive'} Test
                          </p>
                          <p className="text-sm text-gray-500">
                            {test.completed_at ? new Date(test.completed_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                          {test.percentage}%
                        </div>
                        <div className="text-sm text-gray-500">{t('dashboard.score')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('dashboard.noTestsCompleted')}</p>
                  <Link 
                    to="/tests" 
                    className="inline-flex items-center mt-3 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {t('dashboard.takeFirstTest')}
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
                <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.riskAssessment')}</h3>
                {getRiskIcon(dashboardData.risk_assessment?.category)}
              </div>
              
              {dashboardData.risk_assessment ? (
                <div className="text-center">
                                <div className={`text-3xl font-bold mb-2 text-${getRiskColor(dashboardData.risk_assessment.category)}-600`}>
                {dashboardData.risk_assessment.category || 'Unknown'}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {t('dashboard.riskScore')}: {dashboardData.risk_assessment.score || 'N/A'}
              </div>
                  <Link 
                    to="/risk-evaluation" 
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    {t('dashboard.viewDetails')}
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">{t('dashboard.noRiskAssessment')}</p>
                  <Link 
                    to="/risk-evaluation" 
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    {t('dashboard.getAssessed')}
                  </Link>
                </div>
              )}
            </div>

            {/* Next Scheduled Test */}
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.nextTest')}</h3>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              
              {dashboardData.next_scheduled_test ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 capitalize">
                    {dashboardData.next_scheduled_test.test_type ? dashboardData.next_scheduled_test.test_type.replace('_', ' ') : 'Cognitive'} Test
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    {dashboardData.next_scheduled_test.scheduled_date ? new Date(dashboardData.next_scheduled_test.scheduled_date).toLocaleDateString() : 'Unknown'}
                  </p>
                  <Link 
                    to="/tests" 
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors duration-300"
                  >
                    {t('dashboard.startTest')}
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">{t('dashboard.noUpcomingTests')}</p>
                  <Link 
                    to="/tests" 
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    {t('dashboard.scheduleTest')}
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickStats')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('dashboard.testsCompleted')}</span>
                  <span className="font-semibold text-gray-900">{dashboardData.test_summary.total_tests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('dashboard.averageScore')}</span>
                  <span className="font-semibold text-gray-900">
                    {dashboardData.test_summary.average_performance || 'N/A'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('dashboard.streak')}</span>
                  <span className="font-semibold text-gray-900">0 {t('dashboard.days')}</span>
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

      {/* ─── Report Modal ─── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 py-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-accent-100 rounded-2xl flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Patient Health Report</h3>
                  <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Close report"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-6">

              {reportLoading ? (
                <div className="flex flex-col items-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mb-4"></div>
                  <p className="text-gray-500">Loading report data...</p>
                </div>
              ) : (
                <>
                  {/* Patient Details */}
                  <section>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Patient Details</h4>
                    <div className="bg-gray-50 rounded-2xl p-5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Name</span>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {dashboardData.user_profile?.name ||
                            `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Email</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Age</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{dashboardData.user_profile?.age || user?.age || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{dashboardData.user_profile?.gender || user?.gender || 'N/A'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Tracked Data */}
                  <section>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Tracked Data</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{reportTests.length}</p>
                        <p className="text-xs text-blue-500 mt-1">Tests Completed</p>
                      </div>
                      <div className="bg-green-50 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {reportTests.length > 0
                            ? Math.round(reportTests.reduce((s, t) =>
                                s + (t.percentage ?? Math.round((t.score / (t.max_score || 10)) * 100)), 0
                              ) / reportTests.length)
                            : 0}%
                        </p>
                        <p className="text-xs text-green-500 mt-1">Avg Performance</p>
                      </div>
                      <div className="bg-purple-50 rounded-2xl p-4 text-center">
                        <p className="text-sm font-bold text-purple-700">
                          {reportTests.length > 0
                            ? new Date(reportTests.slice().sort(
                                (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
                              )[0].completed_at).toLocaleDateString()
                            : 'N/A'}
                        </p>
                        <p className="text-xs text-purple-500 mt-1">Last Test</p>
                      </div>
                    </div>
                  </section>

                  {/* Risk Assessment */}
                  <section>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Risk Assessment</h4>
                    {dashboardData.risk_assessment ? (() => {
                      const band = getRiskBand(dashboardData.risk_assessment);
                      return (
                        <div className="space-y-3">
                          {/* Score */}
                          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-3">
                            <span className="text-gray-600 text-sm">Risk Score</span>
                            <span className="font-bold text-gray-900">
                              {dashboardData.risk_assessment.score ?? 'N/A'}
                            </span>
                          </div>

                          {/* Visual scale */}
                          <div className="rounded-2xl overflow-hidden">
                            <div className="flex">
                              {[
                                { label: 'Low',      active: band?.bar === 0, from: 'from-green-400',  to: 'to-green-500'  },
                                { label: 'Moderate', active: band?.bar === 1, from: 'from-yellow-400', to: 'to-yellow-500' },
                                { label: 'High',     active: band?.bar === 2, from: 'from-red-400',    to: 'to-red-500'    },
                              ].map((seg) => (
                                <div
                                  key={seg.label}
                                  className={`flex-1 bg-gradient-to-r ${seg.from} ${seg.to} py-2 text-center transition-all duration-300 ${
                                    seg.active ? 'opacity-100 scale-y-110 shadow-md' : 'opacity-40'
                                  }`}
                                >
                                  <span className="text-white text-xs font-bold">{seg.label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex text-center">
                              <span className="flex-1 text-xs text-gray-400 pt-1">0 – 33</span>
                              <span className="flex-1 text-xs text-gray-400 pt-1">34 – 66</span>
                              <span className="flex-1 text-xs text-gray-400 pt-1">67 – 100</span>
                            </div>
                          </div>

                          {/* Risk level badge */}
                          {band && (
                            <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3 ${band.bg} ${band.border}`}>
                              {band.bar === 0
                                ? <ShieldCheck className={`w-6 h-6 ${band.color}`} />
                                : <ShieldAlert className={`w-6 h-6 ${band.color}`} />}
                              <div>
                                <p className={`font-bold ${band.color}`}>{band.label}</p>
                                <p className="text-xs text-gray-500">
                                  {band.bar === 0 && 'Cognitive performance within normal range.'}
                                  {band.bar === 1 && 'Some risk indicators present — regular monitoring advised.'}
                                  {band.bar === 2 && 'Elevated risk detected — professional consultation recommended.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="bg-gray-50 rounded-2xl p-5 text-center">
                        <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No risk assessment completed yet.</p>
                        <Link
                          to="/risk-evaluation"
                          onClick={() => setShowReportModal(false)}
                          className="inline-flex items-center mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Complete Risk Evaluation →
                        </Link>
                      </div>
                    )}
                  </section>

                  {/* Disclaimer */}
                  <section className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Medical Disclaimer</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      This report is generated for tracking and informational purposes only. It is not a
                      medical diagnosis. Please consult a qualified healthcare professional for medical advice.
                    </p>
                  </section>

                  {/* Download Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Link
                      to="/reports"
                      onClick={() => setShowReportModal(false)}
                      className="inline-flex items-center px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                      Full Reports Page
                    </Link>
                    <button
                      id="download-full-report-btn"
                      onClick={handleDownloadDashboardReport}
                      disabled={reportGenerating}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-600 text-white font-semibold rounded-xl hover:bg-accent-700 transition-colors disabled:opacity-60 text-sm shadow-md"
                    >
                      {reportGenerating ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                      ) : (
                        <><Download className="w-4 h-4" /> Download as PDF</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Report Modal ─── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 py-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-11 h-11 bg-accent-100 rounded-2xl flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Patient Health Report</h3>
                  <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Close report"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-6">

              {reportLoading ? (
                <div className="flex flex-col items-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mb-4"></div>
                  <p className="text-gray-500">Loading report data...</p>
                </div>
              ) : (
                <>
                  {/* Patient Details */}
                  <section>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Patient Details</h4>
                    <div className="bg-gray-50 rounded-2xl p-5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Name</span>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {dashboardData.user_profile?.name ||
                            `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Email</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Age</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{dashboardData.user_profile?.age || user?.age || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender</span>
                        <p className="font-semibold text-gray-900 mt-0.5">{dashboardData.user_profile?.gender || user?.gender || 'N/A'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Tracked Data */}
                  <section>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Tracked Data</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{reportTests.length}</p>
                        <p className="text-xs text-blue-500 mt-1">Tests Completed</p>
                      </div>
                      <div className="bg-green-50 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {reportTests.length > 0
                            ? Math.round(reportTests.reduce((s, t) =>
                                s + (t.percentage ?? Math.round((t.score / (t.max_score || 10)) * 100)), 0
                              ) / reportTests.length)
                            : 0}%
                        </p>
                        <p className="text-xs text-green-500 mt-1">Avg Performance</p>
                      </div>
                      <div className="bg-purple-50 rounded-2xl p-4 text-center">
                        <p className="text-sm font-bold text-purple-700">
                          {reportTests.length > 0
                            ? new Date(reportTests.slice().sort(
                                (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
                              )[0].completed_at).toLocaleDateString()
                            : 'N/A'}
                        </p>
                        <p className="text-xs text-purple-500 mt-1">Last Test</p>
                      </div>
                    </div>
                  </section>

                  {/* Risk Assessment */}
                  <section>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Risk Assessment</h4>
                    {dashboardData.risk_assessment ? (() => {
                      const band = getRiskBand(dashboardData.risk_assessment);
                      return (
                        <div className="space-y-3">
                          {/* Score */}
                          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-3">
                            <span className="text-gray-600 text-sm">Risk Score</span>
                            <span className="font-bold text-gray-900">
                              {dashboardData.risk_assessment.score ?? 'N/A'}
                            </span>
                          </div>

                          {/* Visual scale */}
                          <div className="rounded-2xl overflow-hidden">
                            <div className="flex">
                              {[
                                { label: 'Low',      active: band?.bar === 0, from: 'from-green-400',  to: 'to-green-500'  },
                                { label: 'Moderate', active: band?.bar === 1, from: 'from-yellow-400', to: 'to-yellow-500' },
                                { label: 'High',     active: band?.bar === 2, from: 'from-red-400',    to: 'to-red-500'    },
                              ].map((seg) => (
                                <div
                                  key={seg.label}
                                  className={`flex-1 bg-gradient-to-r ${seg.from} ${seg.to} py-2 text-center transition-all duration-300 ${
                                    seg.active ? 'opacity-100 scale-y-110 shadow-md' : 'opacity-40'
                                  }`}
                                >
                                  <span className="text-white text-xs font-bold">{seg.label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex text-center">
                              <span className="flex-1 text-xs text-gray-400 pt-1">0 – 33</span>
                              <span className="flex-1 text-xs text-gray-400 pt-1">34 – 66</span>
                              <span className="flex-1 text-xs text-gray-400 pt-1">67 – 100</span>
                            </div>
                          </div>

                          {/* Risk level badge */}
                          {band && (
                            <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3 ${band.bg} ${band.border}`}>
                              {band.bar === 0
                                ? <ShieldCheck className={`w-6 h-6 ${band.color}`} />
                                : <ShieldAlert className={`w-6 h-6 ${band.color}`} />}
                              <div>
                                <p className={`font-bold ${band.color}`}>{band.label}</p>
                                <p className="text-xs text-gray-500">
                                  {band.bar === 0 && 'Cognitive performance within normal range.'}
                                  {band.bar === 1 && 'Some risk indicators present — regular monitoring advised.'}
                                  {band.bar === 2 && 'Elevated risk detected — professional consultation recommended.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="bg-gray-50 rounded-2xl p-5 text-center">
                        <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No risk assessment completed yet.</p>
                        <Link
                          to="/risk-evaluation"
                          onClick={() => setShowReportModal(false)}
                          className="inline-flex items-center mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          Complete Risk Evaluation →
                        </Link>
                      </div>
                    )}
                  </section>

                  {/* Disclaimer */}
                  <section className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Medical Disclaimer</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      This report is generated for tracking and informational purposes only. It is not a
                      medical diagnosis. Please consult a qualified healthcare professional for medical advice.
                    </p>
                  </section>

                  {/* Download Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Link
                      to="/reports"
                      onClick={() => setShowReportModal(false)}
                      className="inline-flex items-center px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                      Full Reports Page
                    </Link>
                    <button
                      id="download-full-report-btn"
                      onClick={handleDownloadDashboardReport}
                      disabled={reportGenerating}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-600 text-white font-semibold rounded-xl hover:bg-accent-700 transition-colors disabled:opacity-60 text-sm shadow-md"
                    >
                      {reportGenerating ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                      ) : (
                        <><Download className="w-4 h-4" /> Download as PDF</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal Overlay */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <BellRing className="w-6 h-6 mr-3 text-primary-600" /> Schedule Daily Reminder
            </h3>
            <p className="text-gray-600 mb-6">Receive a daily notification to remind you to log in and take your cognitive tests.</p>
            
            {reminderMessage.text && (
              <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${reminderMessage.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                {reminderMessage.text}
              </div>
            )}

            {existingReminders.length > 0 && (
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Active Reminders</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {existingReminders.map(rem => (
                    <div key={rem._id} className="flex items-center justify-between text-sm bg-white p-3 rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                      <div>
                        <div className="font-medium text-gray-900">{rem.time}</div>
                        <div className="text-gray-500 text-xs truncate max-w-[200px]">{rem.email}</div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteReminder(rem._id)}
                        className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleReminderSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  value={reminderForm.email}
                  onChange={(e) => setReminderForm({ ...reminderForm, email: e.target.value })}
                  placeholder="name@example.com"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time</label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  onClick={() => setShowReminderModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reminderLoading}
                  className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {reminderLoading ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
