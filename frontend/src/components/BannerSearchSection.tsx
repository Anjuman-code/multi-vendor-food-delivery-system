import { MapPin, Search } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const suggestions = ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Chicken', 'Salad', 'Seafood', 'Steak'];

const BannerSearchSection: React.FC = () => {
  const navigate = useNavigate();
  const [foodQuery, setFoodQuery] = useState('');
  const [location, setLocation] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions.filter((s) =>
    foodQuery.length > 0 && s.toLowerCase().includes(foodQuery.toLowerCase())
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (foodQuery.trim()) params.set('q', foodQuery.trim());
    if (location.trim()) params.set('location', location.trim());
    navigate(`/restaurants?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase text-center mb-2">
            Find food
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
            Search restaurants near you
          </h2>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-2 flex flex-col sm:flex-row gap-2">
            {/* Food query */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search food or restaurant…"
                value={foodQuery}
                onChange={(e) => {
                  setFoodQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-3 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
              />
              {showSuggestions && filtered.length > 0 && (
                <ul className="absolute z-20 top-full left-0 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                  {filtered.map((s) => (
                    <li
                      key={s}
                      onMouseDown={() => {
                        setFoodQuery(s);
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5 text-gray-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px bg-gray-200 my-1" />

            {/* Location */}
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Your location…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-3 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleSearch}
              className="sm:self-stretch px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannerSearchSection;
