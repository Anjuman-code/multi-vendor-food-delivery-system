import Container from "@/components/public/Container";
import GradientText from "@/components/public/GradientText";
import PageHero from "@/components/public/PageHero";
import Section from "@/components/public/Section";
import SectionHeading from "@/components/public/SectionHeading";
import { Button } from "@/components/ui/button";
import { fadeInUp, inViewport } from "@/lib/motion";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Briefcase,
  Clock,
  GraduationCap,
  HeartHandshake,
  type LucideIcon,
  MapPin,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

interface JoinPath {
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  cta: { label: string; to: string };
  accent: string;
  iconBg: string;
}

const joinPaths: JoinPath[] = [
  {
    icon: Bike,
    title: "Ride with Food Rush",
    description:
      "Earn on your own schedule delivering across Sylhet. Keep 100% of your tips and cash out weekly.",
    points: [
      "Flexible hours — work when you want",
      "Weekly payouts + performance bonuses",
      "Fuel & maintenance partner discounts",
    ],
    cta: { label: "Become a rider", to: "/rider/register" },
    accent: "text-brand-600",
    iconBg: "bg-brand-100 text-brand-600",
  },
  {
    icon: Store,
    title: "Partner your restaurant",
    description:
      "Reach thousands of hungry customers, manage orders from one dashboard, and grow your sales with zero upfront cost.",
    points: [
      "Onboard in under 48 hours",
      "Real-time order & menu management",
      "Marketing support to boost orders",
    ],
    cta: { label: "Sell on Food Rush", to: "/vendor/register" },
    accent: "text-emerald-600",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Briefcase,
    title: "Join the team",
    description:
      "Build the platform powering Sylhet's food economy. We hire across engineering, operations, support, and growth.",
    points: [
      "Engineering, ops, support & marketing",
      "Ownership, mentorship & fast growth",
      "Hybrid-friendly, based in Sylhet",
    ],
    cta: { label: "See open roles", to: "#open-roles" },
    accent: "text-indigo-600",
    iconBg: "bg-indigo-100 text-indigo-600",
  },
];

const stats = [
  { value: "500+", label: "Partner restaurants" },
  { value: "1,200+", label: "Active riders" },
  { value: "50K+", label: "Happy customers" },
  { value: "4", label: "Cities & growing" },
];

const perks: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Wallet,
    title: "Competitive pay",
    description: "Salaries and earnings benchmarked above market, paid reliably and on time.",
  },
  {
    icon: Clock,
    title: "Flexible schedules",
    description: "Roles built around your life — flexible hours and hybrid work where it fits.",
  },
  {
    icon: TrendingUp,
    title: "Real growth",
    description: "Clear progression, ownership from day one, and room to grow as we scale.",
  },
  {
    icon: ShieldCheck,
    title: "Health & safety",
    description: "Insurance coverage, accident protection, and 24/7 support for riders on the road.",
  },
  {
    icon: GraduationCap,
    title: "Learn & level up",
    description: "Training, mentorship, and a budget to keep building your skills.",
  },
  {
    icon: HeartHandshake,
    title: "Community first",
    description: "We invest in Sylhet — local hiring, fair pay, and partners we treat like family.",
  },
];

interface JobOpening {
  title: string;
  department: string;
  location: string;
  type: string;
}

const openings: JobOpening[] = [
  { title: "Senior Frontend Engineer", department: "Engineering", location: "Sylhet (Hybrid)", type: "Full-time" },
  { title: "Backend Engineer (Node.js)", department: "Engineering", location: "Sylhet (Hybrid)", type: "Full-time" },
  { title: "Product Designer", department: "Design", location: "Remote (BD)", type: "Full-time" },
  { title: "Operations Lead", department: "Operations", location: "Sylhet", type: "Full-time" },
  { title: "Rider Fleet Coordinator", department: "Operations", location: "Sylhet", type: "Full-time" },
  { title: "Customer Support Specialist", department: "Support", location: "Sylhet", type: "Full-time" },
  { title: "Restaurant Partnerships Manager", department: "Growth", location: "Sylhet", type: "Full-time" },
  { title: "Performance Marketing Associate", department: "Growth", location: "Remote (BD)", type: "Contract" },
];

const hiringSteps = [
  { step: "01", title: "Apply", description: "Send us your CV and a note on why Food Rush." },
  { step: "02", title: "Intro chat", description: "A 30-minute call with our team to get to know you." },
  { step: "03", title: "Deep dive", description: "A role-specific interview or practical exercise." },
  { step: "04", title: "Offer", description: "We move fast — expect a decision within a week." },
];

const CareersPage: React.FC = () => {
  const departments = Array.from(new Set(openings.map((o) => o.department)));

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Careers at Food Rush"
        eyebrowIcon={Rocket}
        title={
          <>
            <span className="text-gray-900">Build the future of </span>
            <GradientText>food delivery</GradientText>
            <span className="text-gray-900"> in Sylhet</span>
          </>
        }
        subtitle="Whether you ride, cook, or code — there's a place for you at Food Rush. Join the team connecting Sylhet's best restaurants with the people who love them."
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="brand" size="lg">
            <a href="#open-roles">
              View open roles
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#ways-to-join">Ways to join</a>
          </Button>
        </div>
      </PageHero>

      {/* Stats */}
      <Section tone="muted" className="py-12">
        <Container>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
            className="grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-gray-900 md:text-4xl">
                  <GradientText>{stat.value}</GradientText>
                </div>
                <div className="mt-1 text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* Ways to join */}
      <Section id="ways-to-join">
        <Container>
          <SectionHeading
            eyebrow="Ways to join"
            eyebrowIcon={Users}
            title="Three ways to be part of Food Rush"
            description="Every role keeps Sylhet fed. Pick the path that fits you."
            className="mb-14"
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {joinPaths.map((path, index) => (
              <motion.div
                key={path.title}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={inViewport}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-card-lg"
              >
                <div
                  className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${path.iconBg}`}
                >
                  <path.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{path.title}</h3>
                <p className="mt-2 text-gray-600">{path.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {path.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${path.accent}`} />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 pt-2">
                  {path.cta.to.startsWith("#") ? (
                    <Button asChild variant="outline" className="w-full">
                      <a href={path.cta.to}>
                        {path.cta.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button asChild variant="brand" className="w-full">
                      <Link to={path.cta.to}>
                        {path.cta.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Perks */}
      <Section tone="brand">
        <Container>
          <SectionHeading
            eyebrow="Why Food Rush"
            eyebrowIcon={HeartHandshake}
            title="Perks that actually matter"
            description="We look after the people who keep Sylhet moving."
            className="mb-14"
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk, index) => (
              <motion.div
                key={perk.title}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={inViewport}
                transition={{ delay: index * 0.06 }}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <perk.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{perk.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{perk.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Open roles */}
      <Section id="open-roles">
        <Container width="narrow">
          <SectionHeading
            eyebrow="Open roles"
            eyebrowIcon={Briefcase}
            title="Find your role"
            description="Don't see a perfect fit? Reach out anyway — we're always meeting great people."
            className="mb-12"
          />
          <div className="space-y-10">
            {departments.map((department) => (
              <div key={department}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  {department}
                </h3>
                <div className="space-y-3">
                  {openings
                    .filter((opening) => opening.department === department)
                    .map((opening) => (
                      <motion.div
                        key={opening.title}
                        variants={fadeInUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={inViewport}
                        className="group flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5 transition-all hover:border-brand-200 hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <h4 className="font-semibold text-gray-900">{opening.title}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {opening.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {opening.type}
                            </span>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          className="shrink-0 group-hover:border-brand-400 group-hover:text-brand-600"
                        >
                          <Link to={`/contact?role=${encodeURIComponent(opening.title)}`}>
                            Apply
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </motion.div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Hiring process */}
      <Section tone="muted">
        <Container>
          <SectionHeading
            eyebrow="Hiring process"
            eyebrowIcon={Rocket}
            title="How hiring works"
            description="Transparent, respectful of your time, and fast."
            className="mb-14"
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {hiringSteps.map((step, index) => (
              <motion.div
                key={step.step}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={inViewport}
                transition={{ delay: index * 0.08 }}
                className="relative rounded-2xl bg-white p-6 shadow-sm"
              >
                <span className="text-3xl font-bold text-brand-200">{step.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Closing CTA */}
      <section className="bg-gradient-to-r from-brand-500 to-red-500 py-20">
        <Container className="text-center">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
          >
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ready to join the rush?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
              Ride, partner, or build with us. Whichever path you choose, you'll be
              helping Sylhet eat better, every single day.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-brand-600 hover:bg-gray-100">
                <Link to="/rider/register">
                  <Bike className="mr-2 h-5 w-5" />
                  Become a rider
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <Link to="/vendor/register">
                  <Store className="mr-2 h-5 w-5" />
                  Partner with us
                </Link>
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  );
};

export default CareersPage;
