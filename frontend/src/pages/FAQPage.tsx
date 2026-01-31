import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  Search,
  ShoppingBag,
  Truck,
  CreditCard,
  RefreshCw,
  Shield,
  Phone,
  Code,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  faqs: FAQItem[];
}

const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("ordering");

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

  const faqCategories: FAQCategory[] = [
    {
      id: "ordering",
      title: "Ordering",
      icon: ShoppingBag,
      color: "orange",
      faqs: [
        {
          question: "How do I place an order on Anfi?",
          answer:
            "To place an order, simply browse restaurants in your area, select your desired items, add them to your cart, and proceed to checkout. You can pay using bKash, Nagad, Rocket, card, or cash on delivery. Once confirmed, you'll receive real-time updates about your order status.",
        },
        {
          question: "What areas in Sylhet do you deliver to?",
          answer:
            "We currently deliver throughout Sylhet City including Zindabazar, Amberkhana, Bondor, Uposhohor, Shahjalal Uposhohor, Kumarpara, Tilagor, and surrounding areas. We're continuously expanding our delivery zones. Enter your address at checkout to confirm availability.",
        },
        {
          question: "Can I schedule an order for later?",
          answer:
            "Yes! Anfi supports scheduled orders. During checkout, you can select 'Schedule for Later' and choose your preferred delivery date and time. You can schedule orders up to 7 days in advance.",
        },
        {
          question: "Is there a minimum order value?",
          answer:
            "Minimum order values vary by restaurant. The minimum order amount (if any) will be displayed on the restaurant's page. Some restaurants may waive delivery fees for orders above a certain amount.",
        },
        {
          question: "Can I customize my order or add special instructions?",
          answer:
            "Absolutely! You can add special instructions for each item (like 'extra spicy' or 'no onions') and also include delivery instructions (like 'call upon arrival'). Look for the 'Add Note' option when adding items to your cart.",
        },
      ],
    },
    {
      id: "delivery",
      title: "Delivery",
      icon: Truck,
      color: "green",
      faqs: [
        {
          question: "How long does delivery take?",
          answer:
            "Typical delivery times in Sylhet range from 25-45 minutes depending on the restaurant's preparation time, your distance, and current demand. You'll see an estimated delivery time before placing your order, and can track your rider in real-time once the order is dispatched.",
        },
        {
          question: "Can I track my order?",
          answer:
            "Yes! Once your order is confirmed, you can track its progress in real-time through the app. You'll see when the restaurant starts preparing your food, when the rider picks it up, and the rider's live location as they approach your address.",
        },
        {
          question: "What if I'm not available to receive my order?",
          answer:
            "Our rider will attempt to contact you via phone. If you're unavailable, you can ask them to leave the order at your doorstep (contactless delivery) or with a neighbor. Please add any specific instructions in the delivery notes during checkout.",
        },
        {
          question: "Do you deliver during bad weather?",
          answer:
            "We prioritize the safety of our delivery partners. During severe weather conditions, delivery times may be extended or temporarily paused in affected areas. You'll be notified of any delays through the app.",
        },
        {
          question: "What are the delivery charges?",
          answer:
            "Delivery fees vary based on distance and are clearly shown before checkout. Fees typically range from ৳20-60 within Sylhet City. Many restaurants offer free delivery for orders above a certain amount, and Anfi Premium members enjoy reduced or free delivery.",
        },
      ],
    },
    {
      id: "payment",
      title: "Payment",
      icon: CreditCard,
      color: "blue",
      faqs: [
        {
          question: "What payment methods do you accept?",
          answer:
            "We accept bKash, Nagad, Rocket, Visa/Mastercard (credit and debit), and Cash on Delivery (COD) in most areas. You can save multiple payment methods in your account for faster checkout.",
        },
        {
          question: "Is it safe to save my card/mobile banking details?",
          answer:
            "Yes, all payment information is encrypted and securely stored through our PCI-DSS compliant payment partners. We never store your full card number or mobile banking PIN on our servers.",
        },
        {
          question: "Can I split payment between methods?",
          answer:
            "Currently, each order must be paid using a single payment method. However, you can use Anfi wallet credits along with another payment method.",
        },
        {
          question: "What is Anfi Wallet?",
          answer:
            "Anfi Wallet is our in-app wallet where you can add funds, receive refunds, and store promotional credits. Wallet balance can be used for faster checkout and is automatically applied to your orders.",
        },
        {
          question: "How do promo codes work?",
          answer:
            "Enter your promo code at checkout in the designated field. Valid discounts will be applied automatically. Each promo code has specific terms regarding minimum order value, validity period, and eligible restaurants.",
        },
      ],
    },
    {
      id: "refunds",
      title: "Refunds & Issues",
      icon: RefreshCw,
      color: "purple",
      faqs: [
        {
          question: "What if my order is wrong or missing items?",
          answer:
            "Report the issue through the app within 1 hour of delivery by going to your order history and selecting 'Report an Issue'. Include photos if possible. We'll verify with the restaurant and process a refund or credit for affected items.",
        },
        {
          question: "How do I get a refund?",
          answer:
            "Approved refunds are processed within 5-7 business days. For bKash, Nagad, or Rocket payments, refunds go back to your account. For card payments, refunds appear on your statement within 5-10 business days. You can also opt to receive refunds as Anfi wallet credit (instant).",
        },
        {
          question: "My food arrived cold or damaged. What should I do?",
          answer:
            "We're sorry about that! Please report this immediately through the app with photos. Temperature and quality issues are taken seriously, and we'll work with you to make it right through a refund, replacement, or credit.",
        },
        {
          question: "Can I cancel my order?",
          answer:
            "You can cancel your order for free before the restaurant starts preparing it. Once preparation begins, cancellation may not be possible or may incur partial charges. Check your order status in the app to see if cancellation is available.",
        },
        {
          question: "What if my rider never arrived?",
          answer:
            "If there's an issue with your delivery, please contact our support immediately. We track all deliveries and will investigate the issue. Full refunds are provided for undelivered orders.",
        },
      ],
    },
    {
      id: "account",
      title: "Account & Security",
      icon: Shield,
      color: "red",
      faqs: [
        {
          question: "How do I create an account?",
          answer:
            "Download the Anfi app or visit our website and click 'Sign Up'. You can register using your phone number or email. A verification code will be sent to confirm your account.",
        },
        {
          question: "I forgot my password. How do I reset it?",
          answer:
            "Click 'Forgot Password' on the login screen, enter your registered email or phone number, and we'll send you a reset link or OTP. Follow the instructions to create a new password.",
        },
        {
          question: "How do I delete my account?",
          answer:
            "To delete your account, go to Settings > Account > Delete Account. Please note that this action is irreversible and all your order history, saved addresses, and wallet balance will be permanently removed.",
        },
        {
          question: "Is my personal information safe?",
          answer:
            "We take data security seriously. Your personal information is encrypted and stored securely. We never share your data with third parties except as necessary to complete your orders. Read our Privacy Policy for complete details.",
        },
        {
          question: "How do I update my delivery addresses?",
          answer:
            "Go to your Profile > Saved Addresses. You can add, edit, or delete addresses anytime. You can also add a new address during checkout if needed.",
        },
      ],
    },
    {
      id: "support",
      title: "Support",
      icon: Phone,
      color: "teal",
      faqs: [
        {
          question: "How do I contact customer support?",
          answer:
            "You can reach us through: In-app chat (fastest), Phone: +880 1637 429498 (available 24/7 for order issues), Email: support@anfi.com, or visit our office at 30/7 Lovely Road, Sylhet.",
        },
        {
          question: "What are your support hours?",
          answer:
            "Our customer support team is available 24/7 for order-related issues. For general inquiries, we respond within 24 hours on weekdays and 48 hours on weekends.",
        },
        {
          question: "How can I become a delivery rider for Anfi?",
          answer:
            "We're always looking for reliable delivery partners in Sylhet! Visit our 'Become a Rider' page or contact us at riders@anfi.com. You'll need a valid NID, smartphone, and your own vehicle (bike or motorcycle).",
        },
        {
          question: "How can my restaurant partner with Anfi?",
          answer:
            "We'd love to have you! Visit our 'Partner With Us' page or email business@anfi.com. Our team will guide you through the onboarding process, which includes menu setup, tablet configuration, and training.",
        },
        {
          question: "How do I give feedback or suggestions?",
          answer:
            "We value your feedback! After each order, you can rate your experience in the app. For detailed feedback or suggestions, email us at feedback@anfi.com or use the 'Contact Us' form on our website.",
        },
      ],
    },
  ];

  const toggleItem = (categoryId: string, index: number) => {
    const itemKey = `${categoryId}-${index}`;
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(itemKey)) {
      newOpenItems.delete(itemKey);
    } else {
      newOpenItems.add(itemKey);
    }
    setOpenItems(newOpenItems);
  };

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  const activeData =
    searchQuery.length > 0
      ? filteredCategories
      : faqCategories.filter((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
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
                <HelpCircle className="w-4 h-4" />
                Help Center
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold leading-[1.1] mb-6"
            >
              <span className="text-gray-900">How Can We </span>
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Help You?
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
            >
              Find answers to common questions about ordering, delivery,
              payments, and more. Can't find what you're looking for? Contact
              our support team.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              variants={itemVariants}
              className="max-w-xl mx-auto relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Category Navigation */}
      {searchQuery.length === 0 && (
        <section className="py-8 bg-white/50 border-y border-gray-100">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-3">
              {faqCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === category.id
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <category.icon className="w-4 h-4" />
                  {category.title}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {searchQuery.length > 0 && filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 mb-6">
                  We couldn't find any FAQs matching "{searchQuery}"
                </p>
                <Link to="/contact">
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </div>
            )}

            {activeData.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
              >
                {searchQuery.length > 0 && (
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={`w-10 h-10 bg-${category.color}-100 rounded-xl flex items-center justify-center`}
                    >
                      <category.icon
                        className={`w-5 h-5 text-${category.color}-500`}
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {category.title}
                    </h2>
                  </div>
                )}

                <div className="space-y-4">
                  {category.faqs.map((faq, index) => {
                    const itemKey = `${category.id}-${index}`;
                    const isOpen = openItems.has(itemKey);

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="bg-white rounded-xl shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(category.id, index)}
                          className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 pr-4">
                            {faq.question}
                          </span>
                          <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0"
                          >
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Need Help Section */}
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
              Need More Help?
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Still Have Questions?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Our customer support team is available 24/7 to help with any
              issues or questions you might have.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:+8801637429498">
                <Button
                  size="lg"
                  className="bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Support
                </Button>
              </a>
              <Link to="/contact">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Contact Us
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Developer Credit */}
    </div>
  );
};

export default FAQPage;
