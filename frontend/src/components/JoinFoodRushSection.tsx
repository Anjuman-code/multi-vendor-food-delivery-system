import Container from "@/components/public/Container";
import { Button } from "@/components/ui/button";
import { fadeInUp, inViewport } from "@/lib/motion";
import { motion } from "framer-motion";
import { ArrowRight, Bike, Store } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const paths = [
  {
    icon: Bike,
    title: "Deliver with us",
    description:
      "Flexible hours, weekly payouts, and bonuses. Ride when you want, earn what you deserve.",
    to: "/rider/register",
    cta: "Become a rider",
  },
  {
    icon: Store,
    title: "Partner your restaurant",
    description:
      "Reach thousands of customers, manage orders from one dashboard, and grow with zero upfront cost.",
    to: "/vendor/register",
    cta: "Start selling",
  },
];

const JoinFoodRushSection: React.FC = () => (
  <section className="relative overflow-hidden bg-gray-900 py-20 text-white">
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -top-32 right-1/4 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-red-500/10 blur-3xl" />
    </div>

    <Container className="relative z-10">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={inViewport}
        className="mx-auto mb-12 max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
          Grow with Food Rush
        </span>
        <h2 className="mt-5 text-3xl font-bold md:text-4xl">
          There's a place for you here
        </h2>
        <p className="mt-4 text-lg text-white/70">
          Ride, cook, or build — join the team powering Sylhet's food economy.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {paths.map((path, index) => (
          <motion.div
            key={path.title}
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
            transition={{ delay: index * 0.1 }}
            className="group rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur transition-colors hover:bg-white/10"
          >
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-red-500">
              <path.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold">{path.title}</h3>
            <p className="mt-2 text-white/70">{path.description}</p>
            <Button asChild variant="brand" className="mt-6">
              <Link to={path.to}>
                {path.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </div>

      <motion.p
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={inViewport}
        className="mt-10 text-center text-white/70"
      >
        Looking for a corporate role?{" "}
        <Link to="/careers" className="font-semibold text-white underline-offset-4 hover:underline">
          Explore careers at Food Rush
        </Link>
      </motion.p>
    </Container>
  </section>
);

export default JoinFoodRushSection;
