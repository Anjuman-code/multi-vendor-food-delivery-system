import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Star,
  Clock,
  Leaf,
  Smartphone,
  MapPin,
  Sparkles,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NewHeroSection: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
  };

  const benefits = [
    { icon: Clock, text: "30 min delivery", bg: "bg-green-50" },
    { icon: Leaf, text: "Fresh ingredients", bg: "bg-emerald-50" },
    { icon: Smartphone, text: "Live tracking", bg: "bg-blue-50" },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-red-200/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 lg:pt-32 lg:pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Side - Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-xl"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                #1 Food Delivery in Sylhet
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6"
            >
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Hungry?
              </span>
              <br />
              <span className="text-gray-900">Get Food </span>
              <span className="relative inline-block">
                <span className="text-gray-900">Fast!</span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 100 8"
                  fill="none"
                >
                  <path
                    d="M1 5C25 1 75 1 99 5"
                    stroke="url(#underline-gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="underline-gradient"
                      x1="0"
                      y1="0"
                      x2="100"
                      y2="0"
                    >
                      <stop stopColor="#f97316" />
                      <stop offset="1" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 mb-8"
            >
              Delicious meals from 500+ local restaurants, delivered to your
              door.
            </motion.p>

            {/* Benefits - Inline */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3 mb-8"
            >
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-4 py-2 ${benefit.bg} rounded-full`}
                >
                  <benefit.icon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {benefit.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-6 rounded-xl font-semibold text-lg shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-1 group"
              >
                Order Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <button className="flex items-center gap-3 text-gray-700 hover:text-orange-500 transition-colors group">
                <span className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg group-hover:shadow-xl transition-shadow">
                  <Play className="w-5 h-5 fill-orange-500 text-orange-500" />
                </span>
                <span className="font-medium">See how it works</span>
              </button>
            </motion.div>

            {/* Trust Indicators */}
          </motion.div>

          {/* Right Side - Image Collage */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md lg:max-w-lg">
              {/* Image Collage Grid */}
              <div className="relative w-full aspect-square">
                {/* Main Large Image */}
                <motion.div
                  className="absolute top-0 left-0 w-[60%] h-[55%] rounded-3xl overflow-hidden shadow-2xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <img
                    src="/src/assets/images/deliveryman.jpg"
                    alt="Delivery rider"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>

                {/* Top Right Image */}
                <motion.div
                  className="absolute top-4 right-0 w-[45%] h-[40%] rounded-3xl overflow-hidden shadow-xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <img
                    src="https://images.pexels.com/photos/2233729/pexels-photo-2233729.jpeg?auto=compress&cs=tinysrgb&w=600"
                    alt="Gourmet burger"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>

                {/* Bottom Left Image */}
                <motion.div
                  className="absolute bottom-8 left-4 w-[40%] h-[38%] rounded-3xl overflow-hidden shadow-xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <img
                    src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"
                    alt="Delicious healthy food bowl"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>

                {/* Bottom Right Image */}
                <motion.div
                  className="absolute bottom-0 right-4 w-[50%] h-[45%] rounded-3xl overflow-hidden shadow-2xl border-4 border-white"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <img
                    src="https://images.pexels.com/photos/4393021/pexels-photo-4393021.jpeg?auto=compress&cs=tinysrgb&w=600"
                    alt="Food delivery package"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </motion.div>
              </div>

              {/* Floating Elements */}
              <motion.div
                className="absolute top-0 right-0 lg:-right-4 z-20"
                animate={{ y: [-8, 8, -8] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="bg-white rounded-2xl shadow-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl">
                      <MapPin className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivering to</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        Sylhet, BD
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-4 -left-4 lg:left-0 z-20"
                animate={{ y: [8, -8, 8] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <div className="bg-white rounded-2xl shadow-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        4.8 Rating
                      </p>
                      <p className="text-xs text-gray-500">5,000+ reviews</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Decorative Blobs */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-orange-300/30 to-red-300/30 rounded-full blur-2xl -z-10" />
              <div className="absolute top-0 -left-4 w-24 h-24 bg-gradient-to-br from-yellow-300/30 to-orange-300/30 rounded-full blur-2xl -z-10" />
              <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-gradient-to-br from-red-300/20 to-orange-300/20 rounded-full blur-xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default NewHeroSection;
