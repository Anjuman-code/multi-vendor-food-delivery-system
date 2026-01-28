import React from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Truck } from 'lucide-react';

const OrderAndDeliveryProcess: React.FC = () => {
  const steps = [
    {
      id: 1,
      title: "Search & Order",
      description: "Browse through thousands of restaurants and menus to find exactly what you're craving.",
      icon: <Search className="w-8 h-8 text-orange-500" />,
      position: "lg:translate-y-0",
    },
    {
      id: 2,
      title: "Prepare & Pack",
      description: "Our partner restaurants prepare your order with fresh ingredients and pack it securely.",
      icon: <Package className="w-8 h-8 text-orange-500" />,
      position: "lg:translate-y-16",
    },
    {
      id: 3,
      title: "Deliver & Enjoy",
      description: "Sit back and relax as our trusted riders bring your food hot and fresh to your door.",
      icon: <Truck className="w-8 h-8 text-orange-500" />,
      position: "lg:translate-y-0",
    },
  ];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-orange-50 z-0"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Full-width banner */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Simple Steps to Delicious Food
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our streamlined process ensures you get your favorite meals quickly and safely
          </p>
        </div>
        
        {/* Zigzag layout for process steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-orange-200 transform -translate-x-1/2"></div>
          
          <div className="space-y-16 lg:space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center ${step.position}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className="w-full lg:w-5/12 mb-8 lg:mb-0 flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                      {step.id}
                    </div>
                  </div>
                </div>
                
                <div className="w-full lg:w-5/12 text-center lg:text-left">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderAndDeliveryProcess;