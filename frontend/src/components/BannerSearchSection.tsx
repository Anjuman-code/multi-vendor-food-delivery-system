import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const BannerSearchSection: React.FC = () => {
  const [location, setLocation] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mock suggestions for autocomplete
  const mockSuggestions = [
    "Pizza",
    "Burger",
    "Sushi",
    "Pasta",
    "Salad",
    "Tacos",
    "Steak",
    "Chicken",
    "Seafood",
    "Vegetarian"
  ];

  const handleInputChange = (value: string) => {
    setFoodQuery(value);
    if (value.length > 1) {
      const filtered = mockSuggestions.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFoodQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <section className="py-12 bg-gradient-to-r from-orange-400 to-red-500 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-60 h-60 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Find restaurants and food near you
          </h2>
          
          <div className="bg-white rounded-2xl shadow-xl p-2 flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search food or restaurant..."
                value={foodQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => foodQuery.length > 1 && setShowSuggestions(true)}
                className="block w-full pl-10 pr-4 py-4 border-0 rounded-lg focus:ring-2 focus:ring-orange-300 focus:outline-none text-lg"
              />
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 hover:bg-orange-50 cursor-pointer flex items-center"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Search className="h-4 w-4 text-gray-400 mr-2" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Enter your location..."
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="block w-full pl-10 pr-4 py-4 border-0 rounded-lg focus:ring-2 focus:ring-orange-300 focus:outline-none text-lg"
              />
            </div>
            
            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors duration-200 text-lg whitespace-nowrap">
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannerSearchSection;