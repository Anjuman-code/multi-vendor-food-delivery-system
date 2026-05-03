import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-orange-100 to-red-100 mb-6">
          <Coffee className="w-12 h-12 text-orange-500" />
        </div>
        
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved. 
          Maybe you took a wrong turn somewhere.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-full font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <Link to="/restaurants">
            <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-3 rounded-full font-medium transition-all duration-300">
              <Search className="w-4 h-4 mr-2" />
              Browse Restaurants
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;