import React, { useState } from 'react';
import { Star, Clock, MapPin, ChefHat } from 'lucide-react';
import { Transition } from '@headlessui/react';

// Mock data for popular restaurants
const mockPopularRestaurants = [
  {
    id: 1,
    name: "Ocean's Catch",
    cuisine: "Seafood",
    rating: 4.9,
    deliveryTime: "25-35 min",
    distance: "1.5 km",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80",
    description: "Fresh seafood caught daily from local waters. Our chefs prepare your meal with the finest ingredients and traditional techniques.",
    specialties: ["Grilled Salmon", "Lobster Thermidor", "Fish & Chips"]
  },
  {
    id: 2,
    name: "The Gourmet Corner",
    cuisine: "Fine Dining",
    rating: 4.8,
    deliveryTime: "30-40 min",
    distance: "2.1 km",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80",
    description: "Award-winning chef with Michelin-starred experience brings gourmet dining to your home. Each dish is a work of art.",
    specialties: ["Beef Wellington", "Truffle Risotto", "Chocolate Soufflé"]
  },
  {
    id: 3,
    name: "Spice Route",
    cuisine: "Indian",
    rating: 4.7,
    deliveryTime: "20-30 min",
    distance: "0.9 km",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80",
    description: "Authentic Indian flavors prepared with traditional spices and cooking methods. Family recipes passed down for generations.",
    specialties: ["Butter Chicken", "Lamb Rogan Josh", "Garlic Naan"]
  }
];

const PopularRestaurants: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Popular Restaurants
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover the most loved dining experiences in your area
          </p>
        </div>
        
        <div className="space-y-6">
          {mockPopularRestaurants.map((restaurant) => (
            <div 
              key={restaurant.id} 
              className="border border-gray-200 rounded-2xl overflow-hidden shadow-md"
            >
              <button
                className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors duration-200"
                onClick={() => toggleExpand(restaurant.id)}
              >
                <div className="flex items-center">
                  <div className="w-16 h-16 rounded-lg overflow-hidden mr-6">
                    <img 
                      src={restaurant.image} 
                      alt={restaurant.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{restaurant.name}</h3>
                    <div className="flex items-center mt-1">
                      <div className="flex items-center mr-4">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">{restaurant.rating}</span>
                      </div>
                      <span className="text-sm text-gray-600">{restaurant.cuisine}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="mr-6 text-right hidden md:block">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{restaurant.deliveryTime}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{restaurant.distance}</span>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-500 transform transition-transform duration-300 ${expandedId === restaurant.id ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              <Transition
                show={expandedId === restaurant.id}
                enter="transition-all duration-300 ease-out"
                enterFrom="opacity-0 max-h-0"
                enterTo="opacity-100 max-h-[1000px]"
                leave="transition-all duration-300 ease-out"
                leaveFrom="opacity-100 max-h-[1000px]"
                leaveTo="opacity-0 max-h-0"
              >
                <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700 mb-4">{restaurant.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <ChefHat className="w-4 h-4 mr-2 text-orange-500" />
                      Specialties
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {restaurant.specialties.map((specialty, idx) => (
                        <span 
                          key={idx} 
                          className="bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-300">
                    Order Now
                  </button>
                </div>
              </Transition>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularRestaurants;