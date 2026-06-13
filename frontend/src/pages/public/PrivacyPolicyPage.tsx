import LegalPage, { type LegalSection } from "@/components/public/LegalPage";
import { Eye, Lock, Shield, Sparkles } from "lucide-react";
import React from "react";

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    icon: Eye,
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
        text: "We may disclose your information when required by Bangladesh law, court orders, or to protect the rights, property, or safety of Food Rush, our users, or others.",
      },
    ],
  },
  {
    id: "data-security",
    title: "4. Data Security",
    icon: Lock,
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
    icon: Shield,
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
        text: "If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@foodrush.com or call us at +880 1637 429498. You can also visit our office at 30/7 Lovely Road, Sylhet, Bangladesh.",
      },
    ],
  },
];

const PrivacyPolicyPage: React.FC = () => (
  <LegalPage
    eyebrow="Your Privacy Matters"
    eyebrowIcon={Shield}
    title="Privacy Policy"
    intro="At Food Rush, we are committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data."
    lastUpdated="January 31, 2026"
    sections={sections}
    cta={{
      eyebrow: "Our Commitment",
      eyebrowIcon: Sparkles,
      title: "Your Trust is Our Priority",
      body: "We understand that trusting us with your personal information is a significant responsibility. We are committed to maintaining that trust through transparent practices and robust security measures.",
      primary: { label: "Contact Us", to: "/contact" },
      secondary: { label: "View Terms of Service", to: "/terms" },
    }}
  />
);

export default PrivacyPolicyPage;
