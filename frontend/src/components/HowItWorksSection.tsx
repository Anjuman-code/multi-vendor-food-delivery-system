import { motion, useInView } from 'framer-motion';
import { Package, Search, Truck } from 'lucide-react';
import React, { useRef } from 'react';

const steps = [
  {
    id: 1,
    icon: Search,
    title: 'Search & Order',
    description: 'Browse restaurants and pick exactly what you\'re craving.',
    badge: '5,000+ restaurants',
  },
  {
    id: 2,
    icon: Package,
    title: 'Prepare & Pack',
    description: 'Your order is freshly prepared and securely packed.',
    badge: 'Quality checked',
  },
  {
    id: 3,
    icon: Truck,
    title: 'Deliver & Enjoy',
    description: 'Your meal arrives hot and fresh at your door.',
    badge: '30 mins or less',
  },
];

const HowItWorksSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-16" ref={ref}>
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-2">How it works</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Simple steps to delicious food
          </h2>
        </motion.div>

        <div className="relative flex flex-col md:flex-row items-start md:items-stretch gap-0">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gray-100 z-0" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                className="relative flex-1 flex flex-col items-center text-center px-6 py-2"
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: index * 0.12 }}
              >
                {/* Step circle */}
                <div className="relative z-10 w-16 h-16 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 shadow-sm">
                  <Icon className="w-7 h-7 text-orange-500" strokeWidth={1.6} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {step.id}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{step.description}</p>
                <span className="inline-block text-[11px] text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full font-medium">
                  {step.badge}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
