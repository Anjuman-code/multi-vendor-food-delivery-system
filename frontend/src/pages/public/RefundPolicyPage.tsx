import { motion } from "framer-motion";
import {
    AlertTriangle,
    Clock,
    FileText,
    HelpCircle,
    MessageSquare,
    RefreshCw,
    Shield,
    Sparkles,
    XCircle,
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

interface ContentItem {
  subtitle?: string;
  text: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: ContentItem[];
}

const RefundPolicyPage: React.FC = () => {
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

  const sections: Section[] = [
    {
      id: "overview",
      title: "1. Overview",
      icon: RefreshCw,
      content: [
        {
          text: "At Food Rush, we strive to ensure every order meets your expectations. This Refund Policy outlines the conditions under which refunds, replacements, or credits may be issued for orders placed through our platform. By using our services, you agree to the terms described herein.",
        },
        {
          text: "This policy applies to all orders placed through the Food Rush platform (website and mobile application) within Sylhet Division, Bangladesh. It forms an integral part of our Terms and Conditions.",
        },
        {
          text: "We reserve the right to modify this policy at any time. Changes will be effective immediately upon posting. We encourage you to review this page periodically for updates.",
        },
      ],
    },
    {
      id: "cancellation",
      title: "2. Order Cancellation",
      icon: XCircle,
      content: [
        {
          subtitle: "Before Restaurant Acceptance",
          text: "You may cancel an order at no charge before the restaurant has accepted it. Simply go to your active orders and select the cancel option. A full refund will be processed automatically.",
        },
        {
          subtitle: "After Restaurant Acceptance",
          text: "Once a restaurant has accepted and begun preparing your order, cancellation may not be possible. If the restaurant agrees to cancel, a cancellation fee of up to 50% of the order value may apply to cover the cost of prepared ingredients and effort.",
        },
        {
          subtitle: "Restaurant-Initiated Cancellation",
          text: "If a restaurant is unable to fulfill your order due to ingredient unavailability, operational issues, or unexpected closure, the order will be cancelled and you will receive a full refund with no charges.",
        },
        {
          subtitle: "Platform-Initiated Cancellation",
          text: "Food Rush reserves the right to cancel orders in cases of suspected fraud, duplicate orders, technical errors, or violation of our terms. Full refunds will be issued for such cancellations.",
        },
      ],
    },
    {
      id: "quality-issues",
      title: "3. Quality & Delivery Issues",
      icon: AlertTriangle,
      content: [
        {
          subtitle: "Incorrect Order",
          text: "If you receive an item that is significantly different from what you ordered (wrong item, missing modifications), please report it within 1 hour of delivery. We will coordinate with the restaurant to provide a replacement or issue a refund for the incorrect item.",
        },
        {
          subtitle: "Missing Items",
          text: "Report any missing items within 1 hour of delivery. We will verify with the restaurant and process a refund for the missing items or arrange for them to be sent if possible.",
        },
        {
          subtitle: "Quality Concerns",
          text: "If food arrives spoiled, undercooked, or of unacceptable quality, please contact us within 1 hour of delivery with photographic evidence. We will review the issue with the restaurant and issue a full or partial refund as appropriate.",
        },
        {
          subtitle: "Late Delivery",
          text: "While delivery times are estimates, if your order arrives significantly later than the estimated delivery time (exceeding 60 minutes past the latest estimate), you may be eligible for a delivery fee refund or a discount on your next order, depending on the circumstances.",
        },
        {
          subtitle: "Non-Delivery",
          text: "If your order is marked as delivered but was not received, report it within 1 hour. We will investigate with the delivery partner and process a full refund if the order cannot be recovered.",
        },
      ],
    },
    {
      id: "refund-process",
      title: "4. Refund Process",
      icon: Clock,
      content: [
        {
          subtitle: "Filing a Claim",
          text: "All refund claims must be submitted within 1 hour of the scheduled or actual delivery time, whichever is earlier. Claims can be submitted through the app, website, or by contacting our customer support team directly.",
        },
        {
          subtitle: "Required Documentation",
          text: "To process your claim efficiently, please provide: your order number, a description of the issue, photographs of the food if applicable, and any other relevant information. Clear photos significantly expedite the review process.",
        },
        {
          subtitle: "Review & Approval",
          text: "Our support team will review your claim and coordinate with the restaurant and delivery partner as needed. We aim to resolve all claims within 24-48 hours during regular business days.",
        },
        {
          subtitle: "Refund Method",
          text: "Approved refunds will be credited to your original payment method (bKash, Nagad, Rocket, or card) within 5-7 business days. Alternatively, you may choose to receive the refund as Food Rush wallet credit, which is credited instantly and can be used for future orders.",
        },
        {
          subtitle: "Partial Refunds",
          text: "In cases where only part of an order is affected (e.g., one missing item from a multi-item order), a partial refund proportional to the value of the affected items may be issued instead of a full order refund.",
        },
      ],
    },
    {
      id: "non-refundable",
      title: "5. Non-Refundable Situations",
      icon: Shield,
      content: [
        {
          subtitle: "Change of Mind",
          text: "Refunds are not available for change of mind after an order has been prepared or delivered. Please review your order carefully before confirming.",
        },
        {
          subtitle: "Incorrect Address",
          text: "If delivery fails due to an incorrect or incomplete address provided by you, the order is not eligible for a refund. Please ensure your delivery address is accurate before placing an order.",
        },
        {
          subtitle: "Customer Absence",
          text: "If no one is available to receive the delivery after the rider arrives at the specified address and time, and the order cannot be delivered, the order is not eligible for a refund.",
        },
        {
          subtitle: "Delayed Reporting",
          text: "Claims submitted more than 1 hour after delivery will generally not be accepted, except in extraordinary circumstances at the discretion of our support team.",
        },
        {
          subtitle: "Force Majeure",
          text: "Food Rush is not liable for refunds due to delays or failures caused by events beyond our control, including natural disasters, strikes, government-imposed curfews, road closures, or severe weather conditions in Sylhet Division.",
        },
        {
          subtitle: "Promotional Items",
          text: "Items received as part of promotional offers or coupon deals may not be eligible for cash refunds. In such cases, equivalent value credits or replacement items may be offered at our discretion.",
        },
      ],
    },
    {
      id: "disputes",
      title: "6. Dispute Resolution",
      icon: MessageSquare,
      content: [
        {
          subtitle: "Customer Support First",
          text: "If you disagree with a refund decision, please first contact our customer support team at support@foodrush.com or call +880 1637 429498. We will review your case thoroughly.",
        },
        {
          subtitle: "Escalation",
          text: "If a resolution cannot be reached through customer support, you may escalate the matter to our management team by emailing escalation@foodrush.com with details of your case and previous correspondence.",
        },
        {
          subtitle: "Mediation",
          text: "If the dispute remains unresolved, both parties agree to seek mediation through a mutually agreed-upon mediator in Sylhet, Bangladesh before pursuing any formal legal action.",
        },
        {
          subtitle: "Legal Recourse",
          text: "Nothing in this policy limits your statutory rights under Bangladeshi consumer protection laws. You may pursue legal remedies as provided by applicable law in the courts of Sylhet, Bangladesh.",
        },
      ],
    },
    {
      id: "contact",
      title: "7. Contact Information",
      icon: HelpCircle,
      content: [
        {
          subtitle: "Support Channels",
          text: "For refund-related inquiries, you can reach us through the following channels: Email: support@foodrush.com, Phone: +880 1637 429498, In-App Chat: Available 24/7 through the Food Rush app.",
        },
        {
          subtitle: "Office Address",
          text: "30/7 Lovely Road, Sylhet, Bangladesh. Our support team is available Sunday through Saturday, 8:00 AM to 11:00 PM.",
        },
        {
          subtitle: "Response Time",
          text: "We aim to acknowledge all refund claims within 2 hours during business hours and resolve most claims within 24-48 hours. Urgent issues may be escalated for faster resolution.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-red-200/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                <RefreshCw className="w-4 h-4" />
                Refund Policy
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold leading-[1.1] mb-6"
            >
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Refund Policy
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
            >
              We want you to love every order. If something goes wrong, we are
              here to make it right. This policy explains how refunds,
              replacements, and credits are handled.
            </motion.p>

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {sections.slice(0, 8).map((section) => (
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <section.icon className="w-6 h-6 text-orange-500" />
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.content.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {item.subtitle && (
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {item.subtitle}
                        </h3>
                      )}
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

      {/* CTA Section */}
      <section className="py-16 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Need Help?
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Have a Question About Your Order?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Our support team is ready to help resolve any issues with your
              order. Reach out to us and we will make it right.
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
    </div>
  );
};

export default RefundPolicyPage;
