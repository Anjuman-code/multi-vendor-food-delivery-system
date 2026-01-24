import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  isLogin?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left side - Form */}
      <div className="w-full md:w-2/5 bg-white p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-4xl font-bold mb-8">Anfi</h1>
          {children}
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden md:flex w-3/5 bg-gradient-to-br from-orange-500 to-red-600 p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-4 h-4 bg-white bg-opacity-20 rounded-full"></div>
        <div className="absolute top-1/4 right-20 w-6 h-6 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-3 h-3 bg-white bg-opacity-30 rounded-full"></div>
        <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-white bg-opacity-15 rounded-full"></div>
        <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-white bg-opacity-25 rounded-full"></div>
        
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Sylhet's Favorite Food Delivered Fast
          </h2>
          <p className="text-white text-lg mb-8">
            Order from hundreds of local restaurants, track your delivery in real-time, and enjoy Sylhet's best flavors at your doorstep.
          </p>
          
          <ul className="space-y-4 mb-10 text-left text-white">
            <li className="flex items-start">
              <span className="mr-3 mt-1">•</span>
              <span>Fast delivery across Sylhet</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1">•</span>
              <span>Wide variety of local cuisines (hatkora, pitha, beef dishes & more)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1">•</span>
              <span>Real-time order tracking</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1">•</span>
              <span>Secure & easy payments</span>
            </li>
          </ul>
          
          <div className="w-full max-w-xs mx-auto">
            <img 
              src="/src/assets/illustrations/delivery.svg" 
              alt="Delivery Illustration" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Hero Section */}
      <div className="md:hidden w-full bg-gradient-to-br from-orange-500 to-red-600 p-8">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Sylhet's Favorite Food Delivered Fast
          </h2>
          <p className="text-white text-sm mb-6">
            Order from hundreds of local restaurants, track your delivery in real-time, and enjoy Sylhet's best flavors at your doorstep.
          </p>
          
          <ul className="space-y-3 mb-8 text-left text-white">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Fast delivery across Sylhet</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Wide variety of local cuisines</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Real-time order tracking</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Secure & easy payments</span>
            </li>
          </ul>
          
          <div className="w-full max-w-xs mx-auto">
            <img 
              src="/src/assets/illustrations/delivery.svg" 
              alt="Delivery Illustration" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;