import Container from "@/components/public/Container";
import Eyebrow from "@/components/public/Eyebrow";
import PageHero from "@/components/public/PageHero";
import Section from "@/components/public/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { fadeInUp, inViewport } from "@/lib/motion";
import { applyServerErrors, getErrorMessage } from "@/lib/formErrors";
import httpClient from "@/lib/httpClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Clock,
  Facebook,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Twitter,
} from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const contactInfo = [
  {
    icon: MapPin,
    title: "Visit Us",
    details: ["30/7 Lovely Road", "Sylhet 3100, Bangladesh"],
    color: "bg-brand-100 text-brand-500",
  },
  {
    icon: Phone,
    title: "Call Us",
    details: ["+880 1637 429498", "+880 1XXX XXXXXX"],
    color: "bg-green-100 text-green-500",
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["support@foodrush.com", "business@foodrush.com"],
    color: "bg-blue-100 text-blue-500",
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Daily: 8:00 AM - 12:00 AM", "Customer Support: 24/7"],
    color: "bg-purple-100 text-purple-500",
  },
];

const socialLinks = [
  { name: "Facebook", icon: Facebook, href: "#", color: "hover:bg-blue-500" },
  { name: "Twitter", icon: Twitter, href: "#", color: "hover:bg-sky-500" },
  { name: "Instagram", icon: Instagram, href: "#", color: "hover:bg-pink-500" },
];

const responseTiers = [
  "General inquiries: Response within 24 hours",
  "Order issues: Immediate support via phone",
  "Partnership inquiries: Response within 48 hours",
];

const ContactPage: React.FC = () => {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (data: ContactFormData) => {
    try {
      const res = await httpClient.post("/api/contact", data);
      const result = res.data as { success: boolean; message: string };
      if (result.success) {
        toast.success("Message Sent!", {
          description:
            result.message ||
            "Thank you for reaching out. We'll get back to you within 24 hours.",
        });
        reset();
      } else {
        // Attach any backend field errors inline; toast otherwise.
        applyServerErrors(form, result, {
          fallbackMessage:
            result.message || "Failed to send message. Please try again.",
        });
      }
    } catch (err) {
      applyServerErrors(form, err, {
        fallbackMessage: getErrorMessage(
          err,
          "Failed to send message. Please try again later.",
        ),
      });
    }
  };

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Get In Touch"
        eyebrowIcon={MessageCircle}
        title={
          <>
            <span className="text-gray-900">We'd Love to </span>
            <span className="bg-gradient-to-r from-brand-500 to-red-500 bg-clip-text text-transparent">
              Hear From You
            </span>
          </>
        }
        subtitle="Have questions, feedback, or want to partner with us? Our team in Sylhet is here to help. Reach out and we'll respond as soon as possible."
      />

      {/* Contact info cards */}
      <Section className="py-12">
        <Container>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((info, index) => (
              <motion.div
                key={info.title}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={inViewport}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl bg-white p-6 text-center shadow-lg transition-shadow hover:shadow-xl"
              >
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${info.color}`}
                >
                  <info.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-gray-900">{info.title}</h3>
                {info.details.map((detail) => (
                  <p key={detail} className="text-sm text-gray-600">
                    {detail}
                  </p>
                ))}
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Form + sidebar */}
      <Section>
        <Container>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Form */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={inViewport}
              className="rounded-2xl bg-white p-8 shadow-xl"
            >
              <div className="mb-8">
                <Eyebrow icon={Send} className="mb-4">
                  Send a Message
                </Eyebrow>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Contact Form</h2>
                <p className="text-gray-600">
                  Fill out the form below and we'll get back to you shortly.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      aria-invalid={!!errors.name}
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      aria-invalid={!!errors.email}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+880 1XXX XXXXXX"
                      {...register("phone")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      aria-invalid={!!errors.subject}
                      {...register("subject")}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                    aria-invalid={!!errors.message}
                    {...register("message")}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  size="xl"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={inViewport}
              className="space-y-8"
            >
              {/* Location card */}
              <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-brand-100 to-red-100">
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-red-500">
                      <MapPin className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">Our Location</h3>
                    <p className="text-gray-600">
                      30/7 Lovely Road, Sylhet 3100
                      <br />
                      Bangladesh
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick response */}
              <div className="rounded-2xl bg-brand-50 p-8">
                <Eyebrow icon={Sparkles} className="mb-4 bg-white">
                  Quick Response
                </Eyebrow>
                <h3 className="mb-4 text-xl font-bold text-gray-900">
                  We're Here to Help
                </h3>
                <ul className="space-y-3 text-gray-600">
                  {responseTiers.map((tier, index) => (
                    <li key={tier} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{tier}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Social */}
              <div className="rounded-2xl bg-white p-8 shadow-xl">
                <h3 className="mb-4 text-xl font-bold text-gray-900">Connect With Us</h3>
                <p className="mb-6 text-gray-600">
                  Follow us on social media for updates, offers, and more.
                </p>
                <div className="flex gap-4">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.name}
                      href={social.href}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`rounded-xl bg-gray-100 p-4 text-gray-600 transition-all duration-300 hover:text-white ${social.color}`}
                      aria-label={social.name}
                    >
                      <social.icon className="h-6 w-6" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default ContactPage;
