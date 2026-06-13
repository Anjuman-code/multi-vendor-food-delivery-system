import Container from "@/components/public/Container";
import PageHero from "@/components/public/PageHero";
import { fadeInUp, inViewport } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, type LucideIcon } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

export interface LegalBlock {
  subtitle?: string;
  text: string;
}

export interface LegalSection {
  id: string;
  title: string;
  /** Optional icon shown beside the section heading. */
  icon?: LucideIcon;
  content: LegalBlock[];
}

interface LegalPageCta {
  label: string;
  to: string;
}

interface LegalPageProps {
  eyebrow: string;
  eyebrowIcon?: LucideIcon;
  /** Gradient-accented page title (e.g. "Privacy Policy"). */
  title: string;
  intro: string;
  lastUpdated?: string;
  sections: LegalSection[];
  /** Optional closing call-to-action block. */
  cta?: {
    eyebrow?: string;
    eyebrowIcon?: LucideIcon;
    title: string;
    body: string;
    primary: LegalPageCta;
    secondary?: LegalPageCta;
  };
}

/**
 * Shared template for legal / policy pages (Privacy, Terms, Refund, …).
 *
 * Renders a consistent hero, a sticky quick-nav, sectioned content cards,
 * and an optional CTA — all from a structured `sections` array, so every
 * policy page is visually identical and edited as data rather than markup.
 */
const LegalPage: React.FC<LegalPageProps> = ({
  eyebrow,
  eyebrowIcon,
  title,
  intro,
  lastUpdated,
  sections,
  cta,
}) => (
  <div className="min-h-screen">
    <PageHero
      eyebrow={eyebrow}
      eyebrowIcon={eyebrowIcon}
      titleAccent={title}
      subtitle={intro}
      meta={
        lastUpdated ? (
          <>
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Last updated: {lastUpdated}</span>
          </>
        ) : undefined
      }
    />

    {/* Quick navigation */}
    <nav className="border-y border-gray-100 bg-white/50 py-8" aria-label="Sections">
      <Container>
        <ul className="flex flex-wrap justify-center gap-3">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-block rounded-full px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
              >
                {section.title.replace(/^\d+\.\s*/, "")}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </nav>

    {/* Content */}
    <section className="py-16">
      <Container width="narrow">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              id={section.id}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={inViewport}
              className="mb-12 scroll-mt-32"
            >
              <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900 md:text-3xl">
                {Icon && <Icon className="h-6 w-6 text-brand-500" aria-hidden="true" />}
                {section.title}
              </h2>
              <div className="space-y-6">
                {section.content.map((block, blockIndex) => (
                  <div
                    key={blockIndex}
                    className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    {block.subtitle && (
                      <h3 className="mb-2 text-lg font-semibold text-gray-800">
                        {block.subtitle}
                      </h3>
                    )}
                    <p className="leading-relaxed text-gray-600">{block.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </Container>
    </section>

    {/* Closing CTA */}
    {cta && (
      <section className="bg-brand-50 py-16">
        <Container width="narrow">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={inViewport}
            className="mx-auto max-w-2xl text-center"
          >
            {cta.eyebrow && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-600">
                {cta.eyebrowIcon && <cta.eyebrowIcon className="h-4 w-4" aria-hidden="true" />}
                {cta.eyebrow}
              </div>
            )}
            <h2 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
              {cta.title}
            </h2>
            <p className="mb-8 text-lg text-gray-600">{cta.body}</p>
            <div className="flex flex-wrap justify-center gap-4">
              {cta.secondary && (
                <Button asChild variant="outline" size="lg">
                  <Link to={cta.secondary.to}>{cta.secondary.label}</Link>
                </Button>
              )}
              <Button asChild variant="brand" size="lg">
                <Link to={cta.primary.to}>{cta.primary.label}</Link>
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    )}
  </div>
);

export default LegalPage;
