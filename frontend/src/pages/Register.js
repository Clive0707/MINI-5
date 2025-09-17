import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Calendar, UserCheck, Brain, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    familyHistory: '',
    medicalConditions: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        first_name: formData.fullName.split(' ')[0] || formData.fullName,
        last_name: formData.fullName.split(' ').slice(1).join(' ') || 'User',
        email: formData.email,
        password: formData.password,
        age: parseInt(formData.age) || null,
        gender: formData.gender || null,
        family_history: formData.familyHistory || null,
        medical_conditions: formData.medicalConditions || null
      });

      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!formData.password) return { score: 0, color: 'gray', text: '' };
    
    let score = 0;
    if (formData.password.length >= 6) score++;
    if (formData.password.length >= 8) score++;
    if (/[a-z]/.test(formData.password)) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/[0-9]/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;

    if (score <= 2) return { score, color: 'danger', text: 'Weak' };
    if (score <= 4) return { score, color: 'warning', text: 'Fair' };
    return { score, color: 'success', text: 'Strong' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-soft mb-6">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Create Your Account
          </h2>
          <p className="text-lg text-gray-600">
            Join Dementia Tracker to monitor your cognitive health
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-3xl p-8 shadow-soft">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                    )}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 bg-${strength.color}-500`}
                          style={{ width: `${(strength.score / 6) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium text-${strength.color}-600`}>
                        {strength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-300" />
                    )}
                  </button>
                </div>
                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2 flex items-center space-x-2">
                    {formData.password === formData.confirmPassword ? (
                      <CheckCircle className="h-4 w-4 text-success-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-danger-300"></div>
                    )}
                    <span className={`text-xs ${formData.password === formData.confirmPassword ? 'text-success-600' : 'text-danger-600'}`}>
                      {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              {/* Age */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="18"
                    max="120"
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCheck className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="gender"
                    name="gender"
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Family History */}
            <div>
              <label htmlFor="familyHistory" className="block text-sm font-medium text-gray-700 mb-2">
                Family History of Dementia
              </label>
              <textarea
                id="familyHistory"
                name="familyHistory"
                rows="3"
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                placeholder="Describe any family history of dementia or cognitive decline"
                value={formData.familyHistory}
                onChange={handleChange}
              />
            </div>

            {/* Medical Conditions */}
            <div>
              <label htmlFor="medicalConditions" className="block text-sm font-medium text-gray-700 mb-2">
                Medical Conditions
              </label>
              <textarea
                id="medicalConditions"
                name="medicalConditions"
                rows="3"
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-all duration-300"
                placeholder="List any relevant medical conditions"
                value={formData.medicalConditions}
                onChange={handleChange}
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-2xl text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Create account
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </button>
            </div>

            {/* Terms and Privacy */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to our{' '}
                <button type="button" className="text-primary-600 hover:text-primary-700 transition-colors duration-300">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-primary-600 hover:text-primary-700 transition-colors duration-300">
                  Privacy Policy
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-300"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Benefits Preview */}
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            What you'll get with Dementia Tracker
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">Scientifically validated cognitive assessments</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">Personalized risk evaluation</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">Progress tracking and analytics</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">Detailed health reports</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">Regular monitoring reminders</span>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">Secure data storage</span>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-gray-500">
          <div className="flex justify-center space-x-4 mb-2">
            <button type="button" className="hover:text-gray-700 transition-colors duration-300">Privacy Policy</button>
            <button type="button" className="hover:text-gray-700 transition-colors duration-300">Terms of Service</button>
            <button type="button" className="hover:text-gray-700 transition-colors duration-300">Help Center</button>
          </div>
          <p>&copy; 2024 Dementia Tracker. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
