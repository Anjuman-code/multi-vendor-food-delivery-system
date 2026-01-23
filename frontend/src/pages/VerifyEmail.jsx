import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const VerifyEmail = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <div className="flex items-center justify-center flex-1 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg text-center">
            <div className="text-green-500 mb-6">
              <CheckCircle className="w-16 h-16 mx-auto" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Verify Your Email</h1>
            <p className="text-gray-600 mb-8">
              We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
            </p>
            
            <p className="text-gray-600 mb-8">
              Didn't receive the email? <Link to="#" className="text-orange-500 hover:text-orange-600 font-medium">Resend verification email</Link>
            </p>
            
            <Link
              to="/"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 inline-block text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VerifyEmail;