import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const BASELINE_WORD_LIST = ['apple', 'bridge', 'garden', 'pencil', 'sunset'];

const Baseline = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [stage, setStage] = useState('intro'); // intro, memory, recall, complete
  const [visibleWords, setVisibleWords] = useState([]);
  const [remembered, setRemembered] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const words = useMemo(() => {
    // Shuffle the baseline word list for each session
    const shuffled = [...BASELINE_WORD_LIST].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, []);

  useEffect(() => {
    if (stage === 'memory') {
      setVisibleWords(words);
      const timer = setTimeout(() => {
        setVisibleWords([]);
        setStage('recall');
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [stage, words]);

  const calculateScore = () => {
    const answers = remembered
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    const correct = words.filter((word) => answers.includes(word.toLowerCase()));
    return Math.min(10, Math.round((correct.length / words.length) * 10));
  };

  const submitBaseline = async () => {
    setSubmitting(true);
    try {
      const calculatedScore = calculateScore();

      await api.post('/auth/baseline', {
        baselineScores: {
          memoryRecall: calculatedScore
        }
      });

      await refreshProfile();
      toast.success(t('baseline.success'));
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save baseline data';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (user.baselineCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl p-10 shadow-soft text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('baseline.title')}</h1>
          <p className="text-gray-600 mb-6">
            {t('baseline.success')}
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            {t('nav.dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-10 shadow-soft">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('baseline.title')}</h1>
        <p className="text-gray-600 mb-8">{t('baseline.description')}</p>

        {stage === 'intro' && (
          <div className="space-y-6">
            <button
              className="btn-primary w-full"
              onClick={() => setStage('memory')}
            >
              {t('baseline.start')}
            </button>
          </div>
        )}

        {stage === 'memory' && (
          <div className="space-y-6">
            <p className="text-gray-700">{t('baseline.memoryTask')}</p>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <p className="text-center text-sm text-gray-500 mb-3">{t('baseline.visibleFor')}</p>
              <ul className="grid grid-cols-2 gap-3">
                {visibleWords.map((word) => (
                  <li
                    key={word}
                    className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-center font-semibold text-gray-700"
                  >
                    {word}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-gray-500">{t('baseline.recallPrompt')}</p>
          </div>
        )}

        {stage === 'recall' && (
          <div className="space-y-6">
            <textarea
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('baseline.recallPrompt')}
              value={remembered}
              onChange={(e) => setRemembered(e.target.value)}
            />
            <button
              className="btn-primary w-full"
              disabled={submitting}
              onClick={submitBaseline}
            >
              {submitting ? t('baseline.saving') : t('baseline.submit')}
            </button>
          </div>
        )}

        {stage === 'complete' && (
          <div className="text-center">
            <p className="text-gray-700 mb-4">{t('baseline.success')}</p>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              {t('nav.dashboard')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Baseline;
