import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Store,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  ChefHat,
  BarChart3,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const perks = [
  {
    icon: Users,
    title: "Reach More Customers",
    description:
      "Tap into thousands of active food lovers across Sylhet with zero upfront marketing costs.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: TrendingUp,
    title: "Grow Your Revenue",
    description:
      "Our partners see an average 40% increase in monthly orders within the first 3 months.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: BarChart3,
    title: "Powerful Dashboard",
    description:
      "Manage orders, menus, promotions and analytics from one beautiful, easy-to-use dashboard.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: Megaphone,
    title: "Free Promotions",
    description:
      "Create coupons, discounts and special offers to attract and retain loyal customers.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

const stats = [
  { value: "500+", label: "Active Restaurants" },
  { value: "50K+", label: "Monthly Orders" },
  { value: "4.8★", label: "Avg. Partner Rating" },
  { value: "30 min", label: "Avg. Delivery Time" },
];

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

const VendorCTASection: React.FC = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium mb-5 border border-orange-500/30"
          >
            <ChefHat className="w-4 h-4" />
            For Restaurant Owners
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight"
          >
            Grow Your Restaurant{" "}
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              with Us
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-400 text-lg"
          >
            Join hundreds of restaurants already earning more with our platform.
            Set up your store and start receiving orders today.
          </motion.p>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center py-5 px-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Perks grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {perks.map((perk, i) => (
            <motion.div
              key={perk.title}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl ${perk.bg} flex items-center justify-center mb-4`}
              >
                <perk.icon className={`w-6 h-6 ${perk.color}`} />
              </div>
              <h3 className="text-white font-semibold mb-2">{perk.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {perk.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/vendor/register">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-6 rounded-full text-base font-semibold shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 hover:-translate-y-0.5 inline-flex items-center gap-2">
              <Store className="w-5 h-5" />
              Start Selling Today
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-6 rounded-full text-base font-medium transition-all duration-300 bg-transparent"
            >
              <Zap className="w-4 h-4 mr-2" />
              Already a partner? Log in
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default VendorCTASection;
