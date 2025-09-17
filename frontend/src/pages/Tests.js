import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Clock, BarChart3, Play, Calendar, Target, TrendingUp, Award, Zap } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';
import { TestScheduler } from '../components/tests/Tests';

const Tests = () => {
  const [activeTab, setActiveTab] = useState('available');

  const availableTests = [
    {
      id: 'word_recall',
      name: 'Hopkins Verbal Learning Test–Revised (HVLT-R)',
      description: 'Test your memory by memorizing and recalling a list of words. This test evaluates short-term memory capacity and retention.',
      difficulty: 'Easy',
      duration: '3-5 min',
      icon: Brain,
      color: 'primary',
      features: ['Memory assessment', 'Short-term recall', 'Verbal learning']
    },
    {
      id: 'stroop',
      name: 'Stroop Color–Word Interference Test',
      description: 'Measure your attention and cognitive control by identifying the color of text while ignoring the word itself.',
      difficulty: 'Medium',
      duration: '5-7 min',
      icon: Target,
      color: 'secondary',
      features: ['Attention focus', 'Cognitive control', 'Processing speed']
    },
    {
      id: 'pattern_recognition',
      name: 'Pattern Recognition Memory (PRM) Test',
      description: 'Assess your logical reasoning and pattern identification skills by finding the next number in sequences.',
      difficulty: 'Hard',
      duration: '7-10 min',
      icon: TrendingUp,
      color: 'accent',
      features: ['Logical reasoning', 'Pattern analysis', 'Executive function']
    }
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'danger';
      default: return 'gray';
    }
  };

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'from-primary-500 to-primary-600',
      secondary: 'from-secondary-500 to-secondary-600',
      accent: 'from-accent-500 to-accent-600'
    };
    return colorMap[color] || 'from-gray-500 to-gray-600';
  };

  const getIconColor = (color) => {
    const colorMap = {
      primary: 'text-primary-600',
      secondary: 'text-secondary-600',
      accent: 'text-accent-600'
    };
    return colorMap[color] || 'text-gray-600';
  };

  const getBgColor = (color) => {
    const colorMap = {
      primary: 'bg-primary-50',
      secondary: 'bg-secondary-50',
      accent: 'bg-accent-50'
    };
    return colorMap[color] || 'bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm text-primary-700 text-sm font-medium mb-6 shadow-soft">
            <Brain className="w-4 h-4 mr-2" />
            Cognitive Assessment Suite
          </div>
          <h1 className="text-5xl font-display font-bold text-gray-900 mb-4">
            Test Your Cognitive Health
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Take scientifically-validated cognitive assessments to monitor your memory, attention, and executive function. 
            Track your progress over time and identify early warning signs.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-soft">
            <div className="flex space-x-2">
              {[
                { id: 'available', label: 'Available Tests', icon: Play },
                { id: 'scheduled', label: 'Test Scheduler', icon: Calendar },
                { id: 'history', label: 'Test History', icon: BarChart3 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Available Tests Tab */}
        {activeTab === 'available' && (
          <div className="space-y-8">
            {/* Test Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {availableTests.map((test, index) => (
                <div 
                  key={test.id}
                  className="group bg-white rounded-3xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-2 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Test Header */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-20 h-20 ${getBgColor(test.color)} rounded-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <test.icon className={`w-10 h-10 ${getIconColor(test.color)}`} />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
                      {test.name}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {test.description}
                    </p>
                  </div>

                  {/* Test Details */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Difficulty</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${getDifficultyColor(test.difficulty)}-100 text-${getDifficultyColor(test.difficulty)}-800`}>
                        {test.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Duration</span>
                      <span className="text-sm font-medium text-gray-900 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {test.duration}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">What this test measures:</h4>
                    <div className="space-y-2">
                      {test.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-600">
                          <div className={`w-2 h-2 bg-${test.color}-400 rounded-full mr-3`}></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/test/${test.id}`}
                    className={`block w-full text-center py-3 px-6 bg-gradient-to-r ${getColorClasses(test.color)} text-white font-semibold rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1 group-hover:scale-105`}
                  >
                    <div className="flex items-center justify-center">
                      <Play className="w-5 h-5 mr-2" />
                      Start Test
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Test Benefits Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-soft">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
                  Why Regular Testing Matters
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Consistent cognitive assessment helps establish baseline performance and detect subtle changes over time.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Target,
                    title: 'Early Detection',
                    description: 'Identify cognitive changes before they become significant, enabling early intervention.',
                    color: 'primary'
                  },
                  {
                    icon: TrendingUp,
                    title: 'Progress Tracking',
                    description: 'Monitor improvements and identify areas that may need attention or training.',
                    color: 'secondary'
                  },
                  {
                    icon: Award,
                    title: 'Peace of Mind',
                    description: 'Regular testing provides reassurance and helps maintain cognitive health awareness.',
                    color: 'accent'
                  }
                ].map((benefit, index) => (
                  <div key={index} className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-${benefit.color}-100 rounded-2xl mb-4`}>
                      <benefit.icon className={`w-8 h-8 text-${benefit.color}-600`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl p-8 text-white">
              <div className="text-center mb-6">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-80" />
                <h2 className="text-3xl font-display font-bold mb-2">Ready to Get Started?</h2>
                <p className="text-primary-100 text-lg">
                  Choose a test above and begin your cognitive health journey in just a few minutes.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-2xl font-bold mb-1">1</div>
                  <p className="text-sm text-primary-100">Select a test type</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-2xl font-bold mb-1">2</div>
                  <p className="text-sm text-primary-100">Complete the assessment</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-2xl font-bold mb-1">3</div>
                  <p className="text-sm text-primary-100">Review your results</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Scheduler Tab */}
        {activeTab === 'scheduled' && (
          <div className="animate-fade-in">
            <TestScheduler />
          </div>
        )}

        {/* Test History Tab */}
        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-3xl p-8 shadow-soft">
              <div className="text-center mb-8">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Test History</h2>
                <p className="text-gray-600">
                  View your complete testing history and performance trends over time.
                </p>
              </div>
              
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No test history yet</h3>
                <p className="text-gray-500 mb-4">
                  Complete your first cognitive test to start building your history.
                </p>
                <Link
                  to="/tests"
                  className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-2xl hover:bg-primary-700 transition-colors duration-300"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Take Your First Test
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tests;
