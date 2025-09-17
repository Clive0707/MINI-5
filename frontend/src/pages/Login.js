import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Brain, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        toast.success('Welcome back! 🎉');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-soft mb-6">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-lg text-gray-600">
            Sign in to continue monitoring your cognitive health
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl p-8 shadow-soft">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
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
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password Field */}
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
                  placeholder="Enter your password"
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
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button type="button" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-300">
                  Forgot password?
                </button>
              </div>
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
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-2xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors duration-300"
              >
                <span className="text-lg mr-2">📘</span>
                Facebook
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-2xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors duration-300"
              >
                <span className="text-lg mr-2">🐦</span>
                Google
              </button>
            </div>
          </form>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-300"
            >
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Features Preview */}
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Why choose Dementia Tracker?
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
              Scientifically validated cognitive assessments
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-secondary-500 rounded-full mr-3"></div>
              Early detection and risk evaluation
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-accent-500 rounded-full mr-3"></div>
              Progress tracking and detailed reports
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-success-500 rounded-full mr-3"></div>
              Secure and private data storage
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

export default Login;
