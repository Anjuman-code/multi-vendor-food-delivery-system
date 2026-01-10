import React from 'react';
import { Link } from 'react-router-dom';

const CTA = () => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-600 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Join Now and Start Ordering Delicious Food
        </h2>
        <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
          Sign up today and get exclusive discounts on your first order
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="bg-white text-orange-500 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg"
          >
            Register
          </Link>
          <Link
            to="/login"
            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-orange-500 px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CTA;