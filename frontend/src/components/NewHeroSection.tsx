import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Clock, Leaf, Smartphone, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NewHeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-60 h-60 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <motion.div
            className="text-content"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -50 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight mb-4">
              <span className="text-3xl md:text-4xl lg:text-5xl text-orange-500 block mb-2">Hungry?</span>
              Get <span className="text-orange-500">Fresh Food</span> Delivered Fast!
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Discover delicious meals from your favorite local restaurants
            </p>
            
            {/* Search Bar */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search food or restaurant..."
                    className="block w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter your location..."
                    className="block w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 rounded-lg font-semibold transition-colors duration-200 whitespace-nowrap">
                  Search
                </Button>
              </div>
            </div>
            
            {/* Benefits List */}
            <ul className="space-y-4 mb-10">
              <motion.li 
                className="flex items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">Fast delivery in under 30 minutes</span>
              </motion.li>
              <motion.li 
                className="flex items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <Leaf className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">Quality ingredients sourced locally</span>
              </motion.li>
              <motion.li 
                className="flex items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">Easy online ordering with tracking</span>
              </motion.li>
            </ul>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center group transition-all duration-300 transform hover:scale-105 shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Order Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <motion.button
                className="border-2 border-orange-500 text-orange-500 hover:bg-orange-50 font-medium py-4 px-8 rounded-lg transition-colors duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                Browse Restaurants
              </motion.button>
            </div>
            
            {/* Trust Indicators */}
            <motion.div 
              className="mt-10 flex flex-wrap items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="flex items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-gray-700 font-medium">4.8★ from 5,000+ reviews</span>
              </div>
              <div className="text-gray-700 font-medium">500+ restaurants available</div>
            </motion.div>
          </motion.div>
          
          {/* Right Side - Visual Area */}
          <motion.div
            className="illustration-container flex justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 50 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="relative w-full max-w-lg">
              {/* Main illustration container */}
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 overflow-hidden transform rotate-3">
                <div className="w-full h-96 flex items-center justify-center">
                  <img
                    src="/src/assets/illustrations/delivery.svg"
                    alt="Delivery person with food"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Floating elements */}
                <motion.div 
                  className="absolute -top-6 -right-6 bg-white rounded-full p-4 shadow-lg"
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="bg-orange-100 rounded-full p-3">
                    <MapPin className="h-8 w-8 text-orange-500" />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute -bottom-6 -left-6 bg-white rounded-full p-4 shadow-lg"
                  animate={{ y: [10, -10, 10] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                >
                  <div className="bg-red-100 rounded-full p-3">
                    <Star className="h-8 w-8 text-red-500" />
                  </div>
                </motion.div>
                
                {/* Additional floating elements */}
                <motion.div 
                  className="absolute top-1/3 -left-8 bg-white rounded-full p-3 shadow-lg"
                  animate={{ x: [-10, 10, -10] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                >
                  <div className="bg-green-100 rounded-full p-2">
                    <Leaf className="h-6 w-6 text-green-500" />
                  </div>
                </motion.div>
              </div>
              
              {/* Additional decorative elements */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default NewHeroSection;