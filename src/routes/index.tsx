import { createFileRoute } from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";

import { AnalyzeButton } from "@/components/resume-pulse/AnalyzeButton";
import { Hero } from "@/components/resume-pulse/Hero";
import { JobDescriptionCard } from "@/components/resume-pulse/JobDescriptionCard";
import { Navbar } from "@/components/resume-pulse/Navbar";
import { ResumeCard } from "@/components/resume-pulse/ResumeCard";
import { SiteFooter } from "@/components/resume-pulse/SiteFooter";
import { AnalyzerProvider } from "@/hooks/use-analyzer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumePulse — Free ATS Resume Keyword Checker" },
      {
        name: "description",
        content:
          "Check your resume against any job description in seconds. Free ATS keyword match score, parsed in your browser. No signup.",
      },
      { property: "og:title", content: "ResumePulse — Free ATS Resume Keyword Checker" },
      {
        property: "og:description",
        content:
          "Beat the ATS in seconds. Free keyword match score and honest resume optimization, parsed in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <MotionConfig reducedMotion="user">
      <AnalyzerProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Hero />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-6xl px-4 pb-20 sm:px-6"
            >
              <div className="grid items-stretch gap-5 md:grid-cols-2 md:gap-6">
                <ResumeCard />
                <JobDescriptionCard />
              </div>
              <div className="mt-6">
                <AnalyzeButton />
              </div>
            </motion.div>
          </main>
          <SiteFooter />
        </div>
      </AnalyzerProvider>
    </MotionConfig>
  );
}
