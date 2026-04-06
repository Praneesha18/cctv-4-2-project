import React from "react";
import { Link } from "react-router-dom";

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-11 w-11 text-[var(--accent)]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" strokeLinecap="round" />
  </svg>
);

const PlaySearchIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-11 w-11 text-[var(--accent)]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <rect x="3.5" y="5" width="17" height="12.5" rx="2.5" />
    <path d="M10 9.2v4.1l3.7-2.05L10 9.2z" fill="currentColor" stroke="none" />
    <path d="M8 20.5h8" strokeLinecap="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-11 w-11 text-[var(--accent)]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path d="M12 3l7 3.2v5.6c0 4.5-2.7 7.9-7 9.7-4.3-1.8-7-5.2-7-9.7V6.2L12 3z" />
    <path d="M9.5 12l1.7 1.8 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const features = [
  {
    icon: SearchIcon,
    title: "Smart Natural Search",
    description:
      "Describe events in simple language and quickly find the closest matching moments from your stored footage.",
  },
  {
    icon: PlaySearchIcon,
    title: "Quick Review Playback",
    description:
      "Jump directly to important timestamps with smooth preview playback that reduces manual searching.",
  },
  {
    icon: ShieldIcon,
    title: "Private Workspace",
    description:
      "Keep uploads, search activity, and reviewed clips organized safely in your personal workspace.",
  },
];

const metrics = [
  { label: "Fast Search", value: "Find moments instantly" },
  { label: "Smart Results", value: "Relevant timestamp matches" },
  { label: "Secure Space", value: "Private case history" },
];

const steps = [
  {
    number: "01",
    title: "Upload your footage",
    description:
      "Add CCTV clips securely and include optional notes for better search context.",
  },
  {
    number: "02",
    title: "Process the video",
    description:
      "The system processes frames and prepares your video for fast semantic search.",
  },
  {
    number: "03",
    title: "Build searchable data",
    description:
      "Each upload is indexed so your footage becomes ready for quick retrieval.",
  },
  {
    number: "04",
    title: "Search naturally",
    description:
      "Use simple prompts like 'person near entrance' and get the best matches quickly.",
  },
  {
    number: "05",
    title: "Preview the result",
    description:
      "Open the suggested match and inspect the timestamp without extra manual scanning.",
  },
  {
    number: "06",
    title: "Review and confirm",
    description:
      "Open the matched timestamp, preview the clip, and confirm events faster.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen page-background text-white">
      <main className="max-w-full py-10">
        <section className="px-2 py-6 sm:px-4 lg:px-6 lg:py-8">
          <section className="landing-shell-card mx-auto max-w-4xl py-4 text-center">
            <p className="eyebrow">Smart CCTV Search</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#F7F4EB] sm:text-5xl">
              Find important moments in your surveillance footage with ease.
            </h1>
            <p className="body-copy mx-auto mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
              Upload your videos, describe what you want to find, and review accurate matched
              moments from one clean workspace.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/video-input" className="app-button auth-submit-button">
                Start Searching
              </Link>
              <Link to="/history" className="app-button auth-submit-button">
                View Search History
              </Link>
            </div>
          </section>
        </section>

        <section id="services" className="mt-14 bg-secondary py-12 sm:py-14">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">Core Features</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#F7F4EB] sm:text-4xl">
                Everything designed for simple review.
              </h2>
              <p className="body-copy mx-auto mt-5 max-w-2xl text-white/70 leading-8">
                A smoother workflow that helps you search, verify, and confirm events without friction.
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <article
                    key={feature.title}
                    className="flex h-full flex-col items-center px-6 py-4 text-center"
                  >
                    <Icon />
                    <h3 className="mt-6 text-2xl font-semibold text-[#F7F4EB]">{feature.title}</h3>
                    <p className="mt-4 max-w-sm text-sm leading-7 text-white/72">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-14 px-2 py-12 sm:px-4 lg:px-6 ">
          <div className="mx-auto max-w-[1200px]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">How It Works</p>
              <h2 className="mt-4 text-3xl font-semibold text-[#F7F4EB] sm:text-4xl">
                From upload to result in six simple steps.
              </h2>
              <p className="body-copy mx-auto mt-5 max-w-2xl text-white/70 leading-8">
                The workflow stays clear from ingestion to review, so every next action feels obvious.
              </p>
            </div>

            <div className="mt-10 grid  md:grid-cols-2 xl:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="relative">
                  <article
                    className={`flex h-full flex-col items-center px-7 py-7 text-center ${
                      index % 2 === 1 ? "bg-secondary" : "bg-deep"
                    }`}
                  >
                    <div
                      className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]"
                    >
                      Step {step.number}
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-5 max-w-sm text-sm leading-7 text-white/72">
                      {step.description}
                    </p>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[rgba(8,14,10,0.88)] px-4 py-5 text-center text-sm text-white/58 backdrop-blur-xl">
        2026 CCTV Secure · Smarter video search with a clean and modern workflow.
      </footer>
    </div>
  );
};

export default Landing;
