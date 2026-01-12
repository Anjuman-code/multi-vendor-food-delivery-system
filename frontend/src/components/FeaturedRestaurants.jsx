import React from "react";
import RestaurantCard from "./RestaurantCard";

const FeaturedRestaurants = () => {
  // Mock data for featured restaurants
  const restaurants = [
    {
      id: 1,
      name: "Bella Italia",
      cuisine: "Italian • Mediterranean",
      rating: 4.8,
      deliveryTime: "25-35 min",
      distance: "1.2 km",
      image: "https://images.pexels.com/photos/776538/pexels-photo-776538.jpeg",
      description:
        "Authentic Italian cuisine with homemade pasta and wood-fired pizzas.",
    },
    {
      id: 2,
      name: "Spice Garden",
      cuisine: "Indian • Asian",
      rating: 4.7,
      deliveryTime: "30-40 min",
      distance: "2.5 km",
      image: "https://images.pexels.com/photos/776538/pexels-photo-776538.jpeg",
      description:
        "Traditional Indian dishes with aromatic spices and fresh ingredients.",
    },
    {
      id: 3,
      name: "Burger Palace",
      cuisine: "American • Fast Food",
      rating: 4.6,
      deliveryTime: "15-25 min",
      distance: "0.8 km",
      image: "https://images.pexels.com/photos/776538/pexels-photo-776538.jpeg",
      description:
        "Gourmet burgers with premium ingredients and hand-cut fries.",
    },
    {
      id: 4,
      name: "Sushi Master",
      cuisine: "Japanese • Seafood",
      rating: 4.9,
      deliveryTime: "35-45 min",
      distance: "3.0 km",
      image: "https://images.pexels.com/photos/776538/pexels-photo-776538.jpeg",
      description: "Fresh sushi and sashimi prepared by experienced chefs.",
    },
    {
      id: 5,
      name: "Green Leaf Cafe",
      cuisine: "Healthy • Vegetarian",
      rating: 4.5,
      deliveryTime: "20-30 min",
      distance: "1.5 km",
      image:
        "https://images.pexels.com/photos/35516556/pexels-photo-35516556.jpeg",
      description:
        "Organic, healthy meals with fresh locally-sourced ingredients.",
    },
    {
      id: 6,
      name: "Taco Fiesta",
      cuisine: "Mexican • Street Food",
      rating: 4.4,
      deliveryTime: "25-35 min",
      distance: "2.1 km",
      image: "https://images.pexels.com/photos/776538/pexels-photo-776538.jpeg",
      description:
        "Authentic Mexican tacos with homemade sauces and fresh toppings.",
    },
  ];

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Featured Restaurants
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our most popular restaurants offering great food and
            service
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedRestaurants;
