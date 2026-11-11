import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-80 bg-grid" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-5xl px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-14"
      >
        <h1 className="text-balance text-4xl font-semibold tracking-[-0.025em] text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
          Beat the ATS in Seconds.{" "}
          <span className="text-primary sm:block">Check &amp; Optimize Your Resume Free.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Your resume is parsed and scored in your browser, then upgraded with the keywords you can
          truthfully claim.
        </p>
      </motion.div>
    </section>
  );
}
