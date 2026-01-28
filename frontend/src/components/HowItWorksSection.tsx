import React, { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Search, Package, Truck } from 'lucide-react';
import { useRef } from 'react';

const HowItWorksSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      setIsVisible(true);
    }
  }, [isInView]);

  const steps = [
    {
      id: 1,
      title: "Search & Order",
      description: "Browse through thousands of restaurants and menus to find exactly what you're craving.",
      icon: <Search className="w-12 h-12 text-orange-500" />,
      time: "Takes 2 minutes",
      stat: "5,000+ restaurants"
    },
    {
      id: 2,
      title: "Prepare & Pack",
      description: "Our partner restaurants prepare your order with fresh ingredients and pack it securely.",
      icon: <Package className="w-12 h-12 text-orange-500" />,
      time: "Takes 15-20 mins",
      stat: "Quality checked"
    },
    {
      id: 3,
      title: "Deliver & Enjoy",
      description: "Sit back and relax as our trusted riders bring your food hot and fresh to your door.",
      icon: <Truck className="w-12 h-12 text-orange-500" />,
      time: "In 30 mins or less",
      stat: "Track delivery"
    }
  ];

  return (
    <section className="py-20 bg-orange-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-60 h-60 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-gray-800 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            Simple Steps to Delicious Food
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Our streamlined process ensures you get your favorite meals quickly and safely
          </motion.p>
        </div>

        {/* Steps Container */}
        <div className="relative" ref={ref}>
          {/* Steps */}
          <div className="space-y-24 lg:space-y-16">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center`}
                initial={{ opacity: 0, y: 50 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className="w-full lg:w-5/12 mb-8 lg:mb-0 flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {step.id}
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-5/12 text-center lg:text-left px-4">
                  <motion.h3
                    className="text-2xl font-bold text-gray-800 mb-3"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {step.title}
                  </motion.h3>
                  <p className="text-gray-600 mb-3">{step.description}</p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-gray-500">
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full">{step.time}</span>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">{step.stat}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;