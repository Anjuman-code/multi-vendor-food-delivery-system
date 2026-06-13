import LegalPage, { type LegalSection } from "@/components/public/LegalPage";
import {
  AlertTriangle,
  Clock,
  HelpCircle,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";
import React from "react";

const sections: LegalSection[] = [
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

const RefundPolicyPage: React.FC = () => (
  <LegalPage
    eyebrow="Refund Policy"
    eyebrowIcon={RefreshCw}
    title="Refund Policy"
    intro="We want you to love every order. If something goes wrong, we are here to make it right. This policy explains how refunds, replacements, and credits are handled."
    lastUpdated="January 31, 2026"
    sections={sections}
    cta={{
      eyebrow: "Need Help?",
      eyebrowIcon: Sparkles,
      title: "Have a Question About Your Order?",
      body: "Our support team is ready to help resolve any issues with your order. Reach out to us and we will make it right.",
      primary: { label: "Contact Us", to: "/contact" },
      secondary: { label: "View Terms of Service", to: "/terms" },
    }}
  />
);

export default RefundPolicyPage;
