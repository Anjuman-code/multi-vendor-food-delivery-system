import Container from "@/components/public/Container";
import GradientText from "@/components/public/GradientText";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Search, Sparkles, Star, Truck } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const popularSearches = ["Biryani", "Pizza", "Burger", "Cafe", "Chinese"];

const benefits = [
  { icon: Star, label: "4.8 rating", sub: "5k+ reviews" },
  { icon: Truck, label: "30-min delivery", sub: "across Sylhet" },
];

const NewHeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/restaurants?q=${encodeURIComponent(trimmed)}` : "/restaurants");
  };

  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden">
      {/* Soft brand background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-brand-200/50 to-transparent blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-[460px] w-[460px] rounded-full bg-gradient-to-tl from-red-200/40 to-transparent blur-3xl" />
      </div>

      <Container className="relative z-10 grid grid-cols-1 items-center gap-12 pt-28 pb-16 lg:grid-cols-2 lg:gap-8 lg:pt-32">
        {/* ── Copy ─────────────────────────────────────────────── */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-xl">
          <motion.div variants={staggerItem} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 text-sm font-medium text-brand-700">
              <Sparkles className="h-4 w-4" />
              #1 Food Delivery in Sylhet
            </span>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-4xl font-bold leading-[1.08] tracking-tight text-gray-900 md:text-5xl xl:text-6xl"
          >
            Your favorite meals,{" "}
            <GradientText>delivered fast</GradientText>
          </motion.h1>

          <motion.p variants={staggerItem} className="mt-5 text-lg text-gray-600">
            Order from 500+ local restaurants and track every step to your door.
            Fresh, fast, and right on time.
          </motion.p>

          {/* Integrated search */}
          <motion.form
            variants={staggerItem}
            onSubmit={submitSearch}
            className="mt-8 flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-card-lg sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-2 border-gray-100 px-3 sm:border-r">
              <MapPin className="h-5 w-5 shrink-0 text-brand-500" />
              <span className="whitespace-nowrap text-sm font-medium text-gray-700">
                Sylhet
              </span>
            </div>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for food or restaurants"
                aria-label="Search for food or restaurants"
                className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-base outline-none placeholder:text-gray-400"
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="rounded-xl">
              Find food
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.form>

          {/* Popular searches */}
          <motion.div variants={staggerItem} className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400">Popular:</span>
            {popularSearches.map((term) => (
              <Link
                key={term}
                to={`/restaurants?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {term}
              </Link>
            ))}
          </motion.div>

          {/* Trust row */}
          <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.label} className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-gray-900">{benefit.label}</p>
                  <p className="text-xs text-gray-500">{benefit.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Image collage ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto aspect-square w-full max-w-lg">
            <div className="absolute left-0 top-0 h-[55%] w-[58%] overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="https://images.pexels.com/photos/2233729/pexels-photo-2233729.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Gourmet burger"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute right-0 top-6 h-[42%] w-[40%] overflow-hidden rounded-3xl border-4 border-white shadow-xl">
              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Healthy bowl"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-8 h-[46%] w-[52%] overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="https://images.pexels.com/photos/4393021/pexels-photo-4393021.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Food delivery"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute bottom-10 left-0 h-[38%] w-[34%] overflow-hidden rounded-3xl border-4 border-white shadow-xl">
              <img
                src="/src/assets/images/deliveryman.jpg"
                alt="Delivery rider"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Floating delivery card */}
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 top-1/3 z-20 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-brand-100 to-red-100 p-2">
                  <Truck className="h-5 w-5 text-brand-500" />
                </div>
                <div className="leading-tight">
                  <p className="text-xs text-gray-500">Arriving in</p>
                  <p className="text-sm font-semibold text-gray-800">28 min</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [8, -8, 8] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -left-4 bottom-1/4 z-20 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-brand-100 p-2">
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-gray-800">4.8 Rating</p>
                  <p className="text-xs text-gray-500">5,000+ reviews</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
};

export default NewHeroSection;
