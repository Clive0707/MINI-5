import React from 'react';
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('profile.title')}</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">{t('profile.comingSoon')}</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
