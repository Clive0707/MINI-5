import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  Shield, 
  TrendingUp, 
  Clock, 
  Users, 
  Award, 
  ArrowRight, 
  CheckCircle,
  Star,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Brain,
      title: 'Cognitive Assessment',
      description: 'Comprehensive tests to evaluate memory, attention, and executive function',
      color: 'primary'
    },
    {
      icon: Shield,
      title: 'Early Detection',
      description: 'Identify cognitive changes before they become significant',
      color: 'secondary'
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Monitor your cognitive health over time with detailed analytics',
      color: 'accent'
    },
    {
      icon: Clock,
      title: 'Regular Monitoring',
      description: 'Scheduled assessments to maintain consistent health tracking',
      color: 'success'
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Johnson',
      role: 'Neurologist',
      content: 'Dementia Tracker provides invaluable insights for early intervention. The cognitive assessments are scientifically validated and user-friendly.',
      rating: 5,
      avatar: '👩‍⚕️'
    },
    {
      name: 'Michael Chen',
      role: 'Patient',
      content: 'This platform has given me peace of mind. Regular testing helps me stay proactive about my cognitive health.',
      rating: 5,
      avatar: '👨‍🦳'
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Geriatric Specialist',
      content: 'An excellent tool for monitoring cognitive decline. The comprehensive reports help me make informed treatment decisions.',
      rating: 5,
      avatar: '👩‍⚕️'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Active Users' },
    { number: '50,000+', label: 'Tests Completed' },
    { number: '95%', label: 'Accuracy Rate' },
    { number: '24/7', label: 'Support Available' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-healthcare-pattern opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mb-8 animate-fade-in">
              <Brain className="w-4 h-4 mr-2" />
              Cognitive Health Monitoring Platform
            </div>
            
            <h1 className="text-5xl md:text-6xl font-display font-bold text-gray-900 mb-6 leading-tight">
              Take Control of Your
              <span className="block bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Cognitive Health
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Early detection and regular monitoring of cognitive function can make a significant difference. 
              Join thousands of users who are proactively managing their brain health.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
              >
                Start Your Assessment
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/tests"
                className="inline-flex items-center px-8 py-4 border-2 border-primary-200 text-primary-700 font-semibold rounded-2xl hover:bg-primary-50 transition-all duration-300"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-4xl font-bold text-primary-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
              Why Choose Dementia Tracker?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with user-friendly design to provide 
              the most comprehensive cognitive health monitoring experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group bg-white rounded-3xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${feature.color}-100 text-${feature.color}-600 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Getting started with cognitive health monitoring is simple and straightforward.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Account',
                description: 'Sign up and complete your health profile with basic information and medical history.',
                icon: Users
              },
              {
                step: '02',
                title: 'Take Assessments',
                description: 'Complete cognitive tests designed by neuroscience experts to evaluate your brain function.',
                icon: Brain
              },
              {
                step: '03',
                title: 'Track Progress',
                description: 'Monitor your cognitive health over time with detailed reports and trend analysis.',
                icon: TrendingUp
              }
            ].map((item, index) => (
              <div key={index} className="relative text-center animate-slide-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-8 pt-12 shadow-soft">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-6">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied users who trust Dementia Tracker with their cognitive health.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-white rounded-3xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed italic">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-display font-bold text-white mb-4">
            Ready to Start Your Cognitive Health Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of users who are proactively monitoring their brain health. 
            Early detection can make all the difference.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
          >
            Get Started Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions about our platform? We're here to help you get started.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Mail,
                title: 'Email Support',
                content: 'support@dementiatracker.com',
                action: 'Send Email'
              },
              {
                icon: Phone,
                title: 'Phone Support',
                content: '+1 (555) 123-4567',
                action: 'Call Now'
              },
              {
                icon: MapPin,
                title: 'Office Location',
                content: '123 Health Street, Medical District',
                action: 'Get Directions'
              }
            ].map((item, index) => (
              <div 
                key={index} 
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-6">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.content}</p>
                <button className="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-300">
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center mb-4">
                <Brain className="w-8 h-8 text-primary-400 mr-3" />
                <span className="text-2xl font-display font-bold">Dementia Tracker</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Empowering individuals to take control of their cognitive health through 
                early detection and regular monitoring.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors duration-300 cursor-pointer">
                  <span className="text-sm">📘</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors duration-300 cursor-pointer">
                  <span className="text-sm">🐦</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors duration-300 cursor-pointer">
                  <span className="text-sm">💼</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/tests" className="hover:text-white transition-colors duration-300">Cognitive Tests</Link></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors duration-300">Dashboard</Link></li>
                <li><Link to="/reports" className="hover:text-white transition-colors duration-300">Reports</Link></li>
                <li><Link to="/risk-evaluation" className="hover:text-white transition-colors duration-300">Risk Evaluation</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white transition-colors duration-300">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors duration-300">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors duration-300">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors duration-300">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Dementia Tracker. All rights reserved. Made with ❤️ for better cognitive health.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
