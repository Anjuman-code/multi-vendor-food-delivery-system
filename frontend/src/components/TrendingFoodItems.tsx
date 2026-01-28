import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";

// Mock data for trending food items
const mockTrendingItems = [
  {
    id: 1,
    name: "Truffle Mushroom Pizza",
    price: 18.99,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 2,
    name: "Spicy Tuna Roll",
    price: 14.5,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 3,
    name: "BBQ Brisket Burger",
    price: 16.75,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 4,
    name: "Chocolate Lava Cake",
    price: 8.99,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 5,
    name: "Grilled Salmon Bowl",
    price: 19.25,
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: 6,
    name: "Kimchi Fried Rice",
    price: 13.5,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1562883676-82a19a6b0e80?auto=format&fit=crop&w=500&q=80",
  },
];

const TrendingFoodItems: React.FC = () => {
  const [items] = useState(mockTrendingItems);

  // Calculate positions for radial layout
  const calculatePosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2;
    const radius = 200; // Base radius in pixels

    // Vary the radius slightly for a more organic look
    const variedRadius = radius + Math.sin(index * 1.5) * 50;

    return {
      x: Math.cos(angle) * variedRadius,
      y: Math.sin(angle) * variedRadius,
    };
  };

  return (
    <section className="py-16 bg-gradient-to-br from-orange-50 to-red-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Trending Food Items
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover what everyone is raving about - these dishes are flying off
            our menu!
          </p>
        </div>

        {/* Radial layout container */}
        <div className="relative min-h-[600px] flex items-center justify-center">
          {items.map((item, index) => {
            const position = calculatePosition(index, items.length);

            return (
              <motion.div
                key={item.id}
                className="absolute w-48"
                style={{
                  x: position.x,
                  y: position.y,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 1,
                  delay: index * 0.1,
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 2,
                }}
                whileHover={{
                  scale: 1.1,
                  zIndex: 10,
                  transition: { duration: 0.2 },
                }}
              >
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300">
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-orange-500 text-white rounded-full p-2 flex items-center">
                      <Flame className="w-4 h-4 mr-1" />
                      <span className="text-xs font-bold">Hot</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 truncate">
                      {item.name}
                    </h3>

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">
                          {item.rating}
                        </span>
                      </div>
                      <span className="font-bold text-orange-600">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>

                    <button className="mt-4 w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium py-2 rounded-lg transition-colors duration-300">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Center element */}
        </div>
      </div>
    </section>
  );
};

export default TrendingFoodItems;
