import React from 'react';
import { Star, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const RestaurantCard = ({ restaurant }) => {
  const {
    id,
    name,
    cuisine,
    rating,
    deliveryTime,
    distance,
    image,
    description
  } = restaurant;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="h-48 overflow-hidden">
        <img 
          src={image || '/placeholder-restaurant.jpg'} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-800">{name}</h3>
          <div className="flex items-center bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
            <Star className="h-4 w-4 fill-current" />
            <span className="ml-1 font-semibold">{rating}</span>
          </div>
        </div>
        <p className="text-gray-600 mb-3">{cuisine}</p>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
        
        <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{deliveryTime}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{distance}</span>
          </div>
        </div>
        
        <Link
          to={`/restaurant/${id}`}
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3 rounded-lg font-semibold transition-colors duration-200"
        >
          View Menu
        </Link>
      </div>
    </div>
  );
};

export default RestaurantCard;