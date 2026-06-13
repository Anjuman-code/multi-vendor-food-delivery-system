import Eyebrow from "@/components/public/Eyebrow";
import { fadeInUp, inViewport } from "@/lib/motion";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}

/**
 * Eyebrow + title + description block used to introduce in-page sections.
 * Standardizes spacing and the scroll-reveal animation.
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  align = "center",
  className,
}) => (
  <motion.div
    variants={fadeInUp}
    initial="hidden"
    whileInView="visible"
    viewport={inViewport}
    className={cn(
      "max-w-2xl",
      align === "center" ? "mx-auto text-center" : "text-left",
      className,
    )}
  >
    {eyebrow && (
      <div className="mb-4">
        <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
      </div>
    )}
    <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">{title}</h2>
    {description && (
      <p className="mt-4 text-lg text-gray-600">{description}</p>
    )}
  </motion.div>
);

export default SectionHeading;
