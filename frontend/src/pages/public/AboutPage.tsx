import Container from "@/components/public/Container";
import GradientText from "@/components/public/GradientText";
import PageHero from "@/components/public/PageHero";
import Section from "@/components/public/Section";
import SectionHeading from "@/components/public/SectionHeading";
import { Button } from "@/components/ui/button";
import { fadeInUp, inViewport } from "@/lib/motion";
import { motion } from "framer-motion";
import {
  Award,
  ChefHat,
  Clock,
  Code,
  Heart,
  MapPin,
  Sparkles,
  Store,
  Target,
  Truck,
  Users,
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const stats = [
  { icon: Store, value: "500+", label: "Partner Restaurants" },
  { icon: Users, value: "50,000+", label: "Happy Customers" },
  { icon: Truck, value: "100,000+", label: "Deliveries Completed" },
  { icon: ChefHat, value: "200+", label: "Cuisines Available" },
];

const values = [
  {
    icon: Heart,
    title: "Customer First",
    description:
      "Every decision we make starts with our customers in mind. Your satisfaction is our ultimate goal.",
  },
  {
    icon: Clock,
    title: "Speed & Reliability",
    description:
      "We promise fast deliveries without compromising on food quality. Hot food, delivered on time, every time.",
  },
  {
    icon: Award,
    title: "Quality Assurance",
    description:
      "We partner only with restaurants that meet our strict hygiene and quality standards.",
  },
  {
    icon: Users,
    title: "Community Support",
    description:
      "We're committed to supporting local businesses and creating employment opportunities in Sylhet.",
  },
];

const team = [
  {
    name: "Anjuman",
    role: "Co-Founder & Developer",
    description:
      "Full-stack developer passionate about creating seamless user experiences for the Sylhet community.",
  },
  {
    name: "Shafi",
    role: "Co-Founder & Developer",
    description:
      "Backend specialist focused on building robust, scalable systems that power our delivery network.",
  },
];

const AboutPage: React.FC = () => (
  <div className="min-h-screen">
    <PageHero
      eyebrow="Our Story"
      eyebrowIcon={Sparkles}
      title={
        <>
          <span className="text-gray-900">Bringing </span>
          <GradientText>Sylhet's Best Food</GradientText>
          <br />
          <span className="text-gray-900">To Your Doorstep</span>
        </>
      }
      subtitle="Food Rush was born from a simple idea: making it easier for people in Sylhet to enjoy delicious food from their favorite local restaurants without leaving home."
    />

    {/* Stats */}
    <Section tone="muted">
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
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-red-100">
                <stat.icon className="h-8 w-8 text-brand-500" />
              </div>
              <div className="mb-1 text-3xl font-bold text-gray-900 md:text-4xl">
                {stat.value}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </Container>
    </Section>

    {/* Mission */}
    <Section>
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
          >
            <SectionHeading
              eyebrow="Our Mission"
              eyebrowIcon={Target}
              title="Connecting Sylhet Through Food"
              align="left"
            />
            <p className="mt-6 text-lg leading-relaxed text-gray-600">
              We believe that great food has the power to bring people together.
              Our mission is to make the diverse culinary heritage of Sylhet
              accessible to everyone, while supporting local restaurants and
              creating meaningful employment opportunities for delivery partners.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              From the aromatic biryanis of Zindabazar to the famous Pitha of
              Sylhet, we're committed to preserving and promoting our region's
              rich food culture while embracing modern convenience.
            </p>
            <div className="mt-8 flex items-center gap-3 text-gray-500">
              <MapPin className="h-5 w-5 text-brand-500" />
              <span>Proudly serving Sylhet, Bangladesh</span>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
            className="relative"
          >
            <div className="absolute inset-0 rotate-3 rounded-3xl bg-gradient-to-br from-brand-500 to-red-500" />
            <div className="relative rounded-3xl bg-white p-8 shadow-xl">
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-red-100">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-red-500">
                    <Heart className="h-10 w-10 text-white" />
                  </div>
                  <p className="font-medium text-gray-600">Made with love in Sylhet</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>

    {/* Values */}
    <Section tone="brand">
      <Container>
        <SectionHeading
          eyebrow="Our Values"
          eyebrowIcon={Sparkles}
          title="What We Stand For"
          description="These core values guide everything we do, from partnering with restaurants to delivering your food."
          className="mb-16"
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={inViewport}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-red-100">
                <value.icon className="h-7 w-7 text-brand-500" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>

    {/* Team */}
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Meet The Team"
          eyebrowIcon={Code}
          title="The Developers Behind Food Rush"
          description="Passionate developers committed to building the best food delivery experience for Sylhet."
          className="mb-16"
        />
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={inViewport}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl bg-white p-8 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-red-500 text-2xl font-bold text-white">
                {member.name.charAt(0)}
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">{member.name}</h3>
              <p className="mb-4 font-medium text-brand-500">{member.role}</p>
              <p className="text-gray-600">{member.description}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>

    {/* CTA */}
    <section className="bg-gradient-to-r from-brand-500 to-red-500 py-20">
      <Container className="text-center">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={inViewport}
        >
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            Ready to Order?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
            Join thousands of satisfied customers in Sylhet and experience the
            best food delivery service today.
          </p>
          <Button
            asChild
            size="xl"
            className="rounded-xl bg-white text-brand-600 shadow-xl hover:bg-gray-100"
          >
            <Link to="/">Start Ordering Now</Link>
          </Button>
        </motion.div>
      </Container>
    </section>
  </div>
);

export default AboutPage;
