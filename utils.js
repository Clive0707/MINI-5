// ===== UTILITY FUNCTIONS =====

// Date and time utilities
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

export const getRelativeTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  
  return targetDate.toLocaleDateString();
};

// Score calculation utilities
export const calculatePercentage = (score, maxScore) => {
  return Math.round((score / maxScore) * 100);
};

export const getScoreColor = (score, maxScore = 10) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'warning';
  return 'danger';
};

export const getScoreMessage = (score, maxScore = 10) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Excellent! Outstanding performance.';
  if (percentage >= 80) return 'Great job! Strong performance.';
  if (percentage >= 70) return 'Good work! Above average performance.';
  if (percentage >= 60) return 'Fair performance. Room for improvement.';
  if (percentage >= 50) return 'Below average. Consider more practice.';
  return 'Poor performance. Please try again.';
};

// String utilities
export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatTestType = (testType) => {
  return testType
    .split('_')
    .map(word => capitalizeFirst(word))
    .join(' ');
};

// Array utilities
export const shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getRandomItems = (array, count) => {
  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateAge = (age) => {
  return age >= 18 && age <= 120;
};

// Local storage utilities
export const getStoredData = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const setStoredData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

export const removeStoredData = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// API utilities
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data.message || error.response.data.error || 'Server error occurred';
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return 'An unexpected error occurred';
  }
};

// Test utilities
export const generateTestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const calculateTestDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return Math.round((new Date(endTime) - new Date(startTime)) / 1000);
};

// Risk assessment utilities
export const getRiskCategoryColor = (category) => {
  switch (category?.toLowerCase()) {
    case 'low':
      return 'success';
    case 'moderate':
      return 'warning';
    case 'high':
      return 'danger';
    default:
      return 'gray';
  }
};

export const getRiskRecommendations = (category, score) => {
  const recommendations = [];
  
  if (category === 'High' || score >= 70) {
    recommendations.push('Consult with a healthcare professional immediately');
    recommendations.push('Consider comprehensive cognitive evaluation');
    recommendations.push('Regular monitoring and follow-up appointments');
  } else if (category === 'Moderate' || score >= 40) {
    recommendations.push('Schedule regular check-ups with your doctor');
    recommendations.push('Maintain healthy lifestyle habits');
    recommendations.push('Consider cognitive training exercises');
  } else {
    recommendations.push('Continue current healthy habits');
    recommendations.push('Regular annual health screenings');
    recommendations.push('Stay mentally and physically active');
  }
  
  return recommendations;
};

// Chart utilities
export const formatChartData = (data, xKey, yKey) => {
  return data.map(item => ({
    x: item[xKey],
    y: item[yKey]
  }));
};

export const getChartColors = (count) => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
  ];
  
  return colors.slice(0, count);
};

// Export all utilities as default object
const utils = {
  formatDate,
  formatDateTime,
  getRelativeTime,
  calculatePercentage,
  getScoreColor,
  getScoreMessage,
  capitalizeFirst,
  formatTestType,
  shuffle,
  getRandomItems,
  validateEmail,
  validatePassword,
  validateAge,
  getStoredData,
  setStoredData,
  removeStoredData,
  handleApiError,
  generateTestId,
  calculateTestDuration,
  getRiskCategoryColor,
  getRiskRecommendations,
  formatChartData,
  getChartColors
};

export default utils;
