import React from 'react';
import { ShoppingBag, CreditCard, Truck, CheckCircle } from 'lucide-react';

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const HowItWorks: React.FC = () => {
  const steps: Step[] = [
    {
      icon: ShoppingBag,
      title: "Choose a Restaurant",
      description: "Browse through our wide selection of restaurants and cuisines"
    },
    {
      icon: CreditCard,
      title: "Select Food Items",
      description: "Add your favorite dishes to the cart and customize your order"
    },
    {
      icon: Truck,
      title: "Place Your Order",
      description: "Review your order and complete the secure payment process"
    },
    {
      icon: CheckCircle,
      title: "Get Fast Delivery",
      description: "Sit back and relax while we deliver your food right to your door"
    }
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ordering food has never been easier. Follow these simple steps to get delicious food delivered to your door.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;