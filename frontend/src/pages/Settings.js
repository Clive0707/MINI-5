import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', labelKey: 'settings.profile' },
  { id: 'notifications', labelKey: 'settings.notifications' },
  { id: 'language', labelKey: 'settings.language' },
  { id: 'baseline', labelKey: 'settings.baseline' }
];

const Settings = () => {
  const { user, updateProfile, refreshProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [language, setLanguage] = useState(i18n.language || 'en');

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    family_history: user?.family_history || '',
    medical_conditions: user?.medical_conditions || ''
  });

  const [reminderEnabled, setReminderEnabled] = useState(Boolean(user?.reminderEnabled));
  const [reminderTime, setReminderTime] = useState(user?.reminderTime || '09:00');
  const [saving, setSaving] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profileForm);
      await refreshProfile();
      toast.success(t('settings.saved'));
    } catch (err) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveReminders = async () => {
    setSaving(true);
    try {
      const response = await api.put('/auth/reminders', {
        reminderEnabled,
        reminderTime
      });
      await refreshProfile();
      toast.success(t('settings.saved'));
      return response.data;
    } catch (err) {
      toast.error('Failed to save reminders');
    } finally {
      setSaving(false);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setLanguage(lng);
  };

  const baselineContent = useMemo(() => {
    if (user?.baselineCompleted) {
      return (
        <div className="space-y-4">
          <p className="text-gray-600">{t('baseline.success')}</p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-sm text-gray-700">
              <strong>Baseline score:</strong> {user.baselineScores?.memoryRecall ?? '—'} / 10
            </p>
            <p className="text-sm text-gray-500 mt-1">Baseline established on {user.baselineDate ? new Date(user.baselineDate).toLocaleDateString() : '—'}.</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => window.location.assign('/baseline')}
          >
            {t('baseline.start')}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-gray-600">{t('baseline.description')}</p>
        <button
          className="btn-primary"
          onClick={() => window.location.assign('/baseline')}
        >
          {t('baseline.start')}
        </button>
      </div>
    );
  }, [user, t]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('settings.title')}</h1>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`w-full text-left px-4 py-3 rounded-2xl border transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white border-primary-200 text-primary-700'
                      : 'bg-white/70 border-gray-200 text-gray-700 hover:bg-white'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="md:w-2/3 bg-white rounded-3xl shadow-soft p-8">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                    <input
                      name="first_name"
                      value={profileForm.first_name}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                    <input
                      name="last_name"
                      value={profileForm.last_name}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <input
                      name="age"
                      type="number"
                      min={18}
                      max={120}
                      value={profileForm.age}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Family History</label>
                    <textarea
                      name="family_history"
                      value={profileForm.family_history}
                      onChange={handleProfileChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
                    <textarea
                      name="medical_conditions"
                      value={profileForm.medical_conditions}
                      onChange={handleProfileChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <button
                  className="btn-primary"
                  disabled={saving}
                  onClick={saveProfile}
                >
                  {t('settings.saveChanges')}
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('settings.notifications')}</h2>
                    <p className="text-sm text-gray-600">Enable daily reminders to take your cognitive tests.</p>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{t('settings.enableNotifications')}</span>
                  </label>
                </div>
                {reminderEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.reminderTime')}</label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
                <button className="btn-primary" disabled={saving} onClick={saveReminders}>
                  {t('settings.saveChanges')}
                </button>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="space-y-6">
                <p className="text-gray-600">Choose your preferred language for the application.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'हिन्दी' },
                    { code: 'mr', label: 'मराठी' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      className={`w-full text-left px-6 py-4 rounded-2xl border transition-colors ${
                        language === lang.code ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <div className="text-sm font-semibold text-gray-900">{lang.label}</div>
                      <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'baseline' && (
              <div className="space-y-6">
                {baselineContent}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
