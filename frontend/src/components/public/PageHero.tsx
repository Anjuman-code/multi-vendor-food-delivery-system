import Container from "@/components/public/Container";
import Eyebrow from "@/components/public/Eyebrow";
import GradientText from "@/components/public/GradientText";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface PageHeroProps {
  /** Optional pill text shown above the title. */
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  /** Plain-weight portion of the title. Optional when `titleAccent` carries it. */
  title?: React.ReactNode;
  /** Portion of the title rendered with the brand gradient. */
  titleAccent?: string;
  subtitle?: React.ReactNode;
  /** Small meta row under the subtitle (e.g. "Last updated …"). */
  meta?: React.ReactNode;
  /** Extra content (CTAs, search, etc.) rendered below the copy. */
  children?: React.ReactNode;
  className?: string;
  containerWidth?: "default" | "narrow" | "prose";
}

/**
 * Standardized hero header for public content pages. Replaces the
 * hand-rolled `pt-32` hero + decorative blobs + stagger animation that
 * each page reimplemented, so every page header now matches.
 */
const PageHero: React.FC<PageHeroProps> = ({
  eyebrow,
  eyebrowIcon,
  title,
  titleAccent,
  subtitle,
  meta,
  children,
  className,
  containerWidth = "narrow",
}) => (
  <section className={cn("relative overflow-hidden pt-32 pb-16", className)}>
    {/* Decorative background blobs */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-24 left-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-brand-200/40 to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-red-200/30 to-transparent blur-3xl" />
    </div>

    <Container width={containerWidth} className="relative z-10">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-3xl text-center"
      >
        {eyebrow && (
          <motion.div variants={staggerItem} className="mb-6">
            <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
          </motion.div>
        )}

        <motion.h1
          variants={staggerItem}
          className="text-4xl font-bold leading-[1.1] md:text-5xl"
        >
          {titleAccent ? <GradientText>{titleAccent}</GradientText> : title}
          {titleAccent && title ? <> {title}</> : null}
        </motion.h1>

        {subtitle && (
          <motion.p
            variants={staggerItem}
            className="mx-auto mt-6 max-w-2xl text-lg text-gray-600"
          >
            {subtitle}
          </motion.p>
        )}

        {meta && (
          <motion.div
            variants={staggerItem}
            className="mt-8 flex items-center justify-center gap-2 text-gray-500"
          >
            {meta}
          </motion.div>
        )}

        {children && (
          <motion.div variants={staggerItem} className="mt-8">
            {children}
          </motion.div>
        )}
      </motion.div>
    </Container>
  </section>
);

export default PageHero;
