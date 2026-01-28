import React from 'react';
import { Users, Timer, Lock, Navigation } from 'lucide-react';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const Features: React.FC = () => {
  const features: Feature[] = [
    {
      icon: Users,
      title: "Multi-vendor Ordering",
      description: "Order from multiple restaurants in a single delivery, saving time and money."
    },
    {
      icon: Timer,
      title: "Fast Delivery",
      description: "Experience lightning-fast delivery with our optimized logistics network."
    },
    {
      icon: Lock,
      title: "Secure Payment",
      description: "Enjoy peace of mind with our encrypted payment processing system."
    },
    {
      icon: Navigation,
      title: "Real-time Tracking",
      description: "Track your order from kitchen to doorstep with live updates."
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Choose Us</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We offer the best food delivery experience with innovative features and services
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;