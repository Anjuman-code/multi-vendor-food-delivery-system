import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Scale,
  AlertCircle,
  CheckCircle,
  Code,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Truck,
  RefreshCw,
} from "lucide-react";
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

const TermsPage: React.FC = () => {
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
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: CheckCircle,
      content: [
        {
          text: "By accessing or using the Anfi food delivery platform (website and mobile application), you agree to be bound by these Terms and Conditions. If you do not agree to all the terms, please do not use our services.",
        },
        {
          text: "These terms constitute a legally binding agreement between you and Anfi Food Delivery, a company registered and operating in Sylhet, Bangladesh under applicable local business laws.",
        },
        {
          text: "We reserve the right to modify these terms at any time. Continued use of our services after any changes constitutes acceptance of the new terms.",
        },
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility",
      icon: Scale,
      content: [
        {
          text: "You must be at least 16 years old to use our services. If you are under 18, you must have parental or guardian consent.",
        },
        {
          text: "You must have a valid Bangladeshi phone number and provide accurate personal information during registration.",
        },
        {
          text: "You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.",
        },
      ],
    },
    {
      id: "ordering",
      title: "3. Ordering Process",
      icon: ShoppingBag,
      content: [
        {
          subtitle: "Placing Orders",
          text: "When you place an order through Anfi, you are making an offer to purchase food from our partner restaurants. The order is confirmed once accepted by the restaurant and payment is processed.",
        },
        {
          subtitle: "Menu & Pricing",
          text: "Menu items and prices are set by individual restaurants and may change without notice. We strive to display accurate information, but restaurants are responsible for menu accuracy.",
        },
        {
          subtitle: "Order Modifications",
          text: "Once an order is confirmed and being prepared, modifications may not be possible. Please review your order carefully before confirming.",
        },
        {
          subtitle: "Order Cancellation",
          text: "You may cancel an order before it is accepted by the restaurant. Once preparation begins, cancellation may not be possible or may incur charges.",
        },
      ],
    },
    {
      id: "payment",
      title: "4. Payment Terms",
      icon: CreditCard,
      content: [
        {
          subtitle: "Accepted Payment Methods",
          text: "We accept various payment methods including bKash, Nagad, Rocket, credit/debit cards, and cash on delivery (where available). All electronic payments are processed through secure third-party payment gateways.",
        },
        {
          subtitle: "Pricing",
          text: "All prices displayed are in Bangladeshi Taka (BDT) and include applicable taxes unless otherwise stated. Delivery fees and service charges are shown separately before order confirmation.",
        },
        {
          subtitle: "Payment Security",
          text: "We use industry-standard encryption to protect your payment information. We do not store complete card details on our servers.",
        },
        {
          subtitle: "Failed Payments",
          text: "If a payment fails, your order will not be processed. You may attempt payment again or choose an alternative payment method.",
        },
      ],
    },
    {
      id: "delivery",
      title: "5. Delivery Terms",
      icon: Truck,
      content: [
        {
          subtitle: "Delivery Areas",
          text: "Our delivery services are currently available within Sylhet City and selected areas of Sylhet Division. Delivery availability may vary based on your location.",
        },
        {
          subtitle: "Delivery Times",
          text: "Estimated delivery times are provided at checkout and are approximate. Actual delivery times may vary due to traffic, weather, restaurant preparation time, or high demand periods.",
        },
        {
          subtitle: "Delivery Address",
          text: "You are responsible for providing an accurate and complete delivery address. We are not liable for failed deliveries due to incorrect address information.",
        },
        {
          subtitle: "Receipt of Delivery",
          text: "Someone must be available at the delivery address to receive the order. If delivery cannot be completed after reasonable attempts, the order may be cancelled.",
        },
      ],
    },
    {
      id: "refunds",
      title: "6. Refunds & Complaints",
      icon: RefreshCw,
      content: [
        {
          subtitle: "Quality Issues",
          text: "If you receive food that is significantly different from what was ordered, spoiled, or of unacceptable quality, please contact us within 1 hour of delivery with photos for a refund or replacement.",
        },
        {
          subtitle: "Missing Items",
          text: "Report missing items within 1 hour of delivery. We will verify with the restaurant and process appropriate refunds or credits.",
        },
        {
          subtitle: "Refund Processing",
          text: "Approved refunds are processed within 5-7 business days. Refunds will be credited to your original payment method or as Anfi wallet credits.",
        },
        {
          subtitle: "Non-Refundable Situations",
          text: "Refunds may not be provided for: orders cancelled after preparation, incorrect addresses provided by you, or items not available due to customer absence at delivery.",
        },
      ],
    },
    {
      id: "user-conduct",
      title: "7. User Conduct",
      icon: AlertCircle,
      content: [
        {
          text: "You agree not to misuse our platform, including but not limited to: creating fake accounts, placing fraudulent orders, harassing delivery partners or restaurant staff, or attempting to manipulate ratings and reviews.",
        },
        {
          text: "Abusive behavior towards our delivery partners, restaurant partners, or customer service team will result in immediate account suspension.",
        },
        {
          text: "You must not use our platform for any illegal purposes or in violation of Bangladesh law.",
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "8. Intellectual Property",
      icon: FileText,
      content: [
        {
          text: "All content on the Anfi platform, including logos, designs, text, graphics, and software, is the property of Anfi or its licensors and is protected by intellectual property laws.",
        },
        {
          text: "You may not copy, reproduce, distribute, or create derivative works from our content without express written permission.",
        },
        {
          text: "Restaurant logos and menu images are the property of respective restaurant partners and are used with permission.",
        },
      ],
    },
    {
      id: "liability",
      title: "9. Limitation of Liability",
      icon: Scale,
      content: [
        {
          text: "Anfi acts as an intermediary between customers and restaurants. We are not responsible for the quality, safety, or legality of food prepared by restaurants.",
        },
        {
          text: "To the maximum extent permitted by law, Anfi shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.",
        },
        {
          text: "Our total liability shall not exceed the amount paid by you for the specific order giving rise to the claim.",
        },
        {
          text: "We are not liable for delays or failures caused by circumstances beyond our control, including natural disasters, strikes, or government actions.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "10. Governing Law",
      icon: Scale,
      content: [
        {
          text: "These Terms and Conditions are governed by and construed in accordance with the laws of the People's Republic of Bangladesh.",
        },
        {
          text: "Any disputes arising from these terms or your use of our services shall be subject to the exclusive jurisdiction of the courts in Sylhet, Bangladesh.",
        },
        {
          text: "If any provision of these terms is found to be invalid, the remaining provisions shall continue in full force and effect.",
        },
      ],
    },
    {
      id: "contact",
      title: "11. Contact Information",
      icon: FileText,
      content: [
        {
          text: "For questions about these Terms and Conditions, please contact us at:",
        },
        {
          text: "Email: legal@anfi.com | Phone: +880 1637 429498 | Address: 30/7 Lovely Road, Sylhet, Bangladesh",
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
                <Scale className="w-4 h-4" />
                Legal Agreement
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold leading-[1.1] mb-6"
            >
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Terms & Conditions
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
            >
              Please read these terms carefully before using the Anfi food
              delivery platform. By using our services, you agree to be bound by
              these terms.
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

      {/* Agreement Section */}
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
              Thank You
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Questions About Our Terms?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              If you have any questions or concerns about these Terms and
              Conditions, please don't hesitate to reach out to our support
              team.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/privacy"
                className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                View Privacy Policy
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

export default TermsPage;
