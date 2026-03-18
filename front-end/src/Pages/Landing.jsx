import React from "react";
import { Link } from "react-router-dom";

const features = [
  "Semantic search across uploaded CCTV footage",
  "Matched-frame previews that jump to the relevant moment",
  "Private user-scoped video history and retrieval",
  "AI-powered post-event investigation support",
];

const steps = [
  {
    title: "1. Upload footage",
    description: "Go to Video Input, select a video file, choose sampling FPS, and optionally add notes about the incident.",
  },
  {
    title: "2. Let the system analyze it",
    description: "The backend extracts frames, generates embeddings, and stores searchable vectors for later retrieval.",
  },
  {
    title: "3. Search naturally",
    description: "Use everyday text like 'person wearing red near the entrance' to find the most relevant video intervals.",
  },
  {
    title: "4. Review the matched preview",
    description: "Open the result and the preview starts close to the best matched frame so you can verify the event faster.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="surface-card rounded-[32px] p-8 sm:p-10">
            <p className="inline-flex rounded-full border border-[#86F5A8]/25 bg-[#102317] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#CFFFD8]">
              Multimodal CCTV Retrieval
            </p>
            <h1 className="section-title mt-6 max-w-3xl">
              Find the right moment in your video footage without scrubbing through everything.
            </h1>
            <p className="body-copy mt-5 max-w-2xl text-base sm:text-lg">
              Upload recorded video, describe what happened in plain language, and review AI-ranked matches with timestamps and preview playback near the matched frame.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/video-input"
                className="app-button app-button-primary text-sm"
              >
                Go To Video Input
              </Link>
              <Link
                to="/history"
                className="app-button app-button-secondary text-sm"
              >
                Open Search History
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-white/84">
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <aside className="surface-card rounded-[32px] p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/64">What you get</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
                <p className="text-sm text-white/52">Search style</p>
                <p className="mt-2 text-lg font-semibold text-white">Natural-language investigation</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
                <p className="text-sm text-white/52">Best for</p>
                <p className="mt-2 text-lg font-semibold text-white">Post-event review and evidence triage</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
                <p className="text-sm text-white/52">Output</p>
                <p className="mt-2 text-lg font-semibold text-white">Ranked matches with score, interval, and preview</p>
              </div>
            </div>
          </aside>
        </section>

        <section id="services" className="surface-card mt-12 rounded-[32px] p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/64">How To Use</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Use the app in four simple steps</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <article key={step.title} className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                <h3 className="text-lg font-semibold text-[#DFFFE2]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/72">{step.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[rgba(8,14,10,0.9)] px-4 py-5 text-center text-sm text-white/58 backdrop-blur-xl">
        2026 CCTV Secure. Built for searchable video investigation workflows.
      </footer>
    </div>
  );
};

export default Landing;
