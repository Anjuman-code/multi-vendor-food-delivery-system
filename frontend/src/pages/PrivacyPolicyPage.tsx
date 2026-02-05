import React from "react";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Code, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicyPage: React.FC = () => {
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

  const sections = [
    {
      id: "information-we-collect",
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "Personal Information",
          text: "When you create an account or place an order, we collect information such as your name, email address, phone number, and delivery address. This information is essential for processing your orders and providing our delivery services in Sylhet.",
        },
        {
          subtitle: "Payment Information",
          text: "We collect payment details including mobile banking information (bKash, Nagad, Rocket) and card details when you make purchases. All payment data is processed securely through our trusted payment partners and is encrypted during transmission.",
        },
        {
          subtitle: "Location Data",
          text: "With your permission, we collect location data to provide accurate delivery services, show nearby restaurants, and improve our delivery routing within Sylhet Division.",
        },
        {
          subtitle: "Usage Information",
          text: "We automatically collect information about how you interact with our app and website, including pages visited, features used, and search queries to improve our service.",
        },
      ],
    },
    {
      id: "how-we-use",
      title: "2. How We Use Your Information",
      content: [
        {
          subtitle: "Service Delivery",
          text: "Your information is primarily used to process and deliver your food orders, communicate order updates, and provide customer support.",
        },
        {
          subtitle: "Personalization",
          text: "We use your order history and preferences to recommend restaurants and dishes you might enjoy, and to personalize your app experience.",
        },
        {
          subtitle: "Communication",
          text: "We may send you promotional offers, updates about our services, and important notices. You can opt out of marketing communications at any time through your account settings.",
        },
        {
          subtitle: "Safety & Security",
          text: "We use your information to verify identity, prevent fraud, and ensure the safety of our platform, delivery partners, and customers.",
        },
      ],
    },
    {
      id: "data-sharing",
      title: "3. Information Sharing",
      content: [
        {
          subtitle: "Restaurant Partners",
          text: "We share necessary order details with restaurant partners to prepare your food. This includes your name and order specifics but excludes sensitive payment information.",
        },
        {
          subtitle: "Delivery Partners",
          text: "Our delivery riders receive your name, phone number, and delivery address to complete your delivery. They are bound by confidentiality agreements.",
        },
        {
          subtitle: "Service Providers",
          text: "We work with trusted third-party service providers for payment processing, analytics, and customer support. These providers are contractually obligated to protect your data.",
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose your information when required by Bangladesh law, court orders, or to protect the rights, property, or safety of Anfi, our users, or others.",
        },
      ],
    },
    {
      id: "data-security",
      title: "4. Data Security",
      content: [
        {
          subtitle: "Encryption",
          text: "All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols.",
        },
        {
          subtitle: "Access Controls",
          text: "We implement strict access controls to ensure only authorized personnel can access your personal information, and only for legitimate business purposes.",
        },
        {
          subtitle: "Regular Audits",
          text: "We conduct regular security assessments and audits to identify and address potential vulnerabilities in our systems.",
        },
      ],
    },
    {
      id: "your-rights",
      title: "5. Your Rights",
      content: [
        {
          subtitle: "Access & Correction",
          text: "You have the right to access your personal data and request corrections if any information is inaccurate or incomplete.",
        },
        {
          subtitle: "Data Deletion",
          text: "You may request deletion of your account and associated personal data. Some information may be retained as required by Bangladesh law or for legitimate business purposes.",
        },
        {
          subtitle: "Opt-Out",
          text: "You can opt out of marketing communications and adjust your privacy preferences through your account settings at any time.",
        },
        {
          subtitle: "Data Portability",
          text: "Upon request, we can provide you with a copy of your personal data in a commonly used electronic format.",
        },
      ],
    },
    {
      id: "cookies",
      title: "6. Cookies & Tracking",
      content: [
        {
          subtitle: "Essential Cookies",
          text: "We use essential cookies to maintain your session and ensure our platform functions properly.",
        },
        {
          subtitle: "Analytics",
          text: "We use analytics tools to understand how users interact with our platform and to improve our services. You can manage cookie preferences through your browser settings.",
        },
      ],
    },
    {
      id: "children",
      title: "7. Children's Privacy",
      content: [
        {
          subtitle: "Age Requirement",
          text: "Our services are not intended for children under 16 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.",
        },
      ],
    },
    {
      id: "changes",
      title: "8. Changes to This Policy",
      content: [
        {
          subtitle: "Updates",
          text: "We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of significant changes through the app or email.",
        },
        {
          subtitle: "Effective Date",
          text: "This Privacy Policy was last updated on January 31, 2026, and is effective immediately for all users.",
        },
      ],
    },
    {
      id: "contact",
      title: "9. Contact Us",
      content: [
        {
          subtitle: "Questions & Concerns",
          text: "If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@anfi.com or call us at +880 1637 429498. You can also visit our office at 30/7 Lovely Road, Sylhet, Bangladesh.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-red-200/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                <Shield className="w-4 h-4" />
                Your Privacy Matters
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold leading-[1.1] mb-6"
            >
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Privacy Policy
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
            >
              At Anfi, we are committed to protecting your privacy and ensuring
              the security of your personal information. This policy explains
              how we collect, use, and safeguard your data.
            </motion.p>

            {/* Last Updated */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-2 text-gray-500"
            >
              <FileText className="w-4 h-4" />
              <span>Last updated: January 31, 2026</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-8 bg-white/50 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-4 py-2 text-sm text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
              >
                {section.title.split(". ")[1]}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {sections.map((section, sectionIndex) => (
              <motion.div
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: sectionIndex * 0.05 }}
                className="mb-12 scroll-mt-32"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  {sectionIndex === 0 && (
                    <Eye className="w-6 h-6 text-orange-500" />
                  )}
                  {sectionIndex === 3 && (
                    <Lock className="w-6 h-6 text-orange-500" />
                  )}
                  {sectionIndex === 4 && (
                    <Shield className="w-6 h-6 text-orange-500" />
                  )}
                  {section.title}
                </h2>
                <div className="space-y-6">
                  {section.content.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {item.subtitle}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-orange-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Our Commitment
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Your Trust is Our Priority
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              We understand that trusting us with your personal information is a
              significant responsibility. We are committed to maintaining that
              trust through transparent practices and robust security measures.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/terms"
                className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                View Terms of Service
              </Link>
              <Link
                to="/contact"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-colors shadow-lg shadow-orange-500/25"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Developer Credit */}
    </div>
  );
};

export default PrivacyPolicyPage;
