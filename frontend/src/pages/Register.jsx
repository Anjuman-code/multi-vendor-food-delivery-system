import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    deliveryAddress: '',
    agreeTerms: false,
    subscribe: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        if (!value) return 'Full name is required';
        if (value.trim().split(' ').length < 2) return 'Please enter your full name (first and last)';
        if (value.length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Email address is invalid';
        return '';
      case 'phone':
        if (!value) return 'Phone number is required';
        if (!/^\+?[\d\s\-\(\)]+$/.test(value)) return 'Phone number is invalid';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
          return 'Password must contain uppercase, lowercase, number, and special character';
        }
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      case 'agreeTerms':
        if (!value) return 'You must agree to the terms and conditions';
        return '';
      default:
        return '';
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return '';
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));

    // Calculate password strength when password changes
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'subscribe' && key !== 'deliveryAddress') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // On successful registration, redirect to verification or dashboard
      navigate('/verify-email');
    }, 1500);
  };

  const handleSocialRegister = (provider) => {
    console.log(`Registering with ${provider}`);
    // Social registration implementation would go here
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-140px)]">
        {/* Left side - Registration Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md">
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Create Account</h1>
                <p className="text-gray-600">Join Anfi and start ordering from your favorite restaurants</p>
              </div>

              {/* Social Registration Buttons */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleSocialRegister('Google')}
                    className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                    </svg>
                    <span className="text-gray-700 font-medium">Google</span>
                  </button>
                  <button
                    onClick={() => handleSocialRegister('Facebook')}
                    className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-gray-700 font-medium">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleSocialRegister('Apple')}
                    className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 12.04C17.02 9.3 19.15 7.95 19.24 7.9 17.98 5.98 15.95 5.87 15.2 5.87 14.15 5.87 13.1 6.65 12.45 6.65 11.75 6.65 10.8 5.9 9.65 5.9 7.7 5.9 5.45 7.25 4.4 9.25 2.35 12.45 3.8 17.15 5.8 19.55 7.05 21.05 8.6 22.6 10.9 22.6 12.2 22.6 13.45 21.85 14.2 21.85 15.2 21.85 15.95 20.6 16.65 20.6 17.35 20.6 18.05 21.25 19.1 21.25 19 19.95 17.75 18.65 17.7 18.65 15.65 18.65 14.6 16.95 14.6 16.95 12.75 19.6 9.65 19.6 8.9 19.6 7.65 19.6 6.4 18.5 6.85 16.4 7.3 14.3 9.25 13.4 10.35 13.4 11.45 13.4 12.4 14.15 13.1 14.15 13.8 14.15 14.85 13.35 15.5 13.35 16.15 13.35 17.02 14.1 17.05 12.04ZM14.7 4.4C15.45 3.55 16 2.4 15.9 1.25 14.75 1.2 13.6 1.85 12.9 2.95 12.25 4 11.95 5.25 12.1 6.5 13.2 6.55 14 5.65 14.7 4.4Z"/>
                    </svg>
                    <span className="text-gray-700 font-medium">Apple</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center mb-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-500">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit}>
                {/* Full Name Field */}
                <div className="mb-4">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your full name"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>

                {/* Email Field */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your email"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number Field */}
                <div className="mb-4">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="+1 (555) 000-0000"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Create a password"
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                  
                  {/* Password Strength Indicator */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          passwordStrength === 'weak' ? 'bg-red-500 w-1/3' :
                          passwordStrength === 'medium' ? 'bg-yellow-500 w-2/3' :
                          passwordStrength === 'strong' ? 'bg-green-500 w-full' : 'w-0'
                        }`}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Weak</span>
                      <span>Medium</span>
                      <span>Strong</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Re-enter your password"
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="mb-4 text-xs text-gray-600">
                  <p>Password must contain:</p>
                  <ul className="space-y-1 mt-1">
                    <li className="flex items-center">
                      {formData.password && formData.password.length >= 8 ? (
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <span>At least 8 characters</span>
                    </li>
                    <li className="flex items-center">
                      {formData.password && /[a-z]/.test(formData.password) ? (
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <span>One lowercase letter</span>
                    </li>
                    <li className="flex items-center">
                      {formData.password && /[A-Z]/.test(formData.password) ? (
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <span>One uppercase letter</span>
                    </li>
                    <li className="flex items-center">
                      {formData.password && /\d/.test(formData.password) ? (
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <span>One number</span>
                    </li>
                    <li className="flex items-center">
                      {formData.password && /[@$!%*?&]/.test(formData.password) ? (
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <span>One special character</span>
                    </li>
                  </ul>
                </div>

                {/* Delivery Address Field */}
                <div className="mb-4">
                  <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address (Optional)
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="text"
                      id="deliveryAddress"
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleChange}
                      placeholder="Enter your delivery address"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-4">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="agreeTerms" className="ml-2 block text-sm text-gray-700">
                      I agree to the <Link to="/terms" className="text-orange-500 hover:text-orange-600">Terms of Service</Link> and <Link to="/privacy" className="text-orange-500 hover:text-orange-600">Privacy Policy</Link>
                    </label>
                  </div>
                  {errors.agreeTerms && (
                    <p className="mt-1 text-sm text-red-600">{errors.agreeTerms}</p>
                  )}
                </div>

                {/* Newsletter Subscription */}
                <div className="mb-6">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="subscribe"
                      name="subscribe"
                      checked={formData.subscribe}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="subscribe" className="ml-2 block text-sm text-gray-700">
                      Send me exclusive offers and updates
                    </label>
                  </div>
                </div>

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Sign In Prompt */}
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-orange-500 hover:text-orange-600">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Promotional Content */}
        <div className="hidden md:block w-1/2 bg-gradient-to-br from-orange-50 to-red-50 p-12 flex items-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg inline-block">
              <div className="text-orange-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Anfi Today</h2>
              <ul className="text-left text-gray-600 space-y-2 mb-6">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Order from 1000+ restaurants</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Real-time order tracking</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Fast delivery to your door</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Exclusive deals and discounts</span>
                </li>
              </ul>
              <div className="flex items-center justify-center">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-2 text-gray-700 font-medium">4.8 Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Register;