import React from "react";
import {
  Soup,
  Pizza,
  Coffee,
  ChefHat,
  IceCream,
  Heart,
  Utensils,
  Apple,
} from "lucide-react";

const Categories = () => {
  const categories = [
    {
      name: "Fast Food",
      icon: Utensils,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-500",
    },
    {
      name: "Pizza",
      icon: Pizza,
      bgColor: "bg-red-100",
      iconColor: "text-red-500",
    },
    {
      name: "Burgers",
      icon: ChefHat,
      bgColor: "bg-green-100",
      iconColor: "text-green-500",
    },
    {
      name: "Chinese",
      icon: Soup,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-500",
    },
    {
      name: "Desserts",
      icon: IceCream,
      bgColor: "bg-pink-100",
      iconColor: "text-pink-500",
    },
    {
      name: "Healthy",
      icon: Apple,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Food Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {categories.map((category) => (
            <div
              key={category.name}
              className={`${category.bgColor} rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg`}
            >
              {/* Icon Container: Increased padding and size */}
              <div
                className={`flex items-center justify-center mb-6 p-4 rounded-full ${category.bgColor} ${category.iconColor}`}
              >
                {/* Icon: Increased from w-8 to w-16 */}
                <category.icon className="h-12 w-12" />
              </div>

              <h3 className="font-semibold text-xl text-gray-800">
                {category.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
