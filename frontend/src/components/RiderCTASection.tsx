import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Banknote,
  Calendar,
  Clock,
  MapPin,
  Smartphone,
  Star,
  Truck,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

const BENEFITS = [
  {
    icon: Banknote,
    title: 'Earn Competitive Pay',
    description: 'Keep 100% of delivery fees plus tips. Get paid weekly with instant withdrawal options.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Calendar,
    title: 'Flexible Schedule',
    description: 'Work when you want, as much as you want. No minimum hours or shift commitments.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: MapPin,
    title: 'Deliver in Your Area',
    description: 'Stay in neighborhoods you know. Delivery zones tailored to your preferred location.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Star,
    title: 'Growth & Rewards',
    description: 'Top-rated riders earn bonuses, priority access to high-value orders, and performance rewards.',
    color: 'bg-amber-50 text-amber-600',
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Sign Up',
    description: 'Register online in minutes. Submit your documents and get verified.',
  },
  {
    step: 2,
    title: 'Get Approved',
    description: 'Our team reviews your application. Most approvals happen within 24 hours.',
  },
  {
    step: 3,
    title: 'Start Earning',
    description: 'Go online, accept delivery requests, and earn money on your schedule.',
  },
];

const RiderCTASection: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-orange-50 py-20 lg:py-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-red-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wide mb-5">
            <Truck className="w-3.5 h-3.5" />
            Become a Rider
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
            Deliver with{' '}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Food Rush
            </span>{' '}
            and Earn on Your Terms
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
            Join the fastest-growing delivery fleet in Sylhet. Be your own boss, set your own hours, 
            and earn great money delivering food people love.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        >
          {[
            { value: '200+', label: 'Active Riders' },
            { value: '৳25K', label: 'Avg. Weekly Earnings' },
            { value: '4.9★', label: 'Rider Satisfaction' },
            { value: '30 min', label: 'Avg. Delivery Time' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm"
            >
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${benefit.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{benefit.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="mb-16"
        >
          <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Getting started is easy</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((item, i) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {item.step}
                    </div>
                    {i < HOW_IT_WORKS.length - 1 && (
                      <div className="hidden sm:block w-0.5 h-full bg-gradient-to-b from-orange-300 to-transparent mt-1" />
                    )}
                  </div>
                  <div className={i < HOW_IT_WORKS.length - 1 ? 'pb-6 sm:pb-0' : ''}>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
          className="relative bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden"
        >
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10">
            <Truck className="w-10 h-10 mx-auto mb-4 opacity-80" />
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to Start Earning?
            </h3>
            <p className="text-orange-100 max-w-lg mx-auto mb-6 text-sm sm:text-base">
              Join Food Rush today and be part of Sylhet's premier delivery network. 
              No prior experience needed — we'll guide you every step of the way.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 shadow-lg shadow-orange-700/20 rounded-full px-8 font-semibold"
              >
                <Link to="/rider/register">
                  <Truck className="w-4 h-4 mr-2" />
                  Become a Rider
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white rounded-full px-8 font-semibold"
              >
                <Link to={isAuthenticated ? '/rider' : '/login'}>
                  <Clock className="w-4 h-4 mr-2" />
                  {isAuthenticated ? 'Rider Dashboard' : 'Sign In'}
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default React.memo(RiderCTASection);
