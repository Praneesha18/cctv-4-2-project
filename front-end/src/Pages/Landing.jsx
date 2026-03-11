import React from "react";

const Landing = () => {
  return (
    <div className="min-h-screen page-background text-white">
      <main>
        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold leading-tight sm:text-4xl">
            Post-Event Video Analysis and Retrieval Using Multimodal AI
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm text-white/85 sm:text-base">
            Secure your home and business with advanced monitoring systems.
            Reliable, scalable, and intelligent protection.
          </p>
          <button className="mt-8 rounded-md bg-[#8BAE66] px-6 py-3 text-sm font-semibold text-[#1B211A] transition hover:bg-[#769854]">
            Get Started
          </button>
        </section>

        <section
          id="services"
          className="mx-auto max-w-4xl rounded-[28px] border border-[#7DDE86]/30 bg-[#08130D]/65 px-6 py-12 text-center text-white shadow-[0_0_50px_rgba(73,255,133,0.16)] backdrop-blur-md sm:px-8"
        >
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Our Services</h2>

          <div className="mx-auto mt-4 h-[2px] w-48 bg-gradient-to-r from-transparent via-[#7DDE86] to-transparent" />

          <div className="mt-7 space-y-3 text-base text-white/90 sm:text-xl">
            <p className="flex items-center justify-center gap-3">
              <span className="text-[#9DFFAB]">&#10004;</span>
              <span>24/7 Live Monitoring</span>
            </p>
            <p className="flex items-center justify-center gap-3">
              <span className="text-[#9DFFAB]">&#10004;</span>
              <span>Cloud Storage Support</span>
            </p>
            <p className="flex items-center justify-center gap-3">
              <span className="text-[#9DFFAB]">&#10004;</span>
              <span>High Resolution Cameras</span>
            </p>
            <p className="flex items-center justify-center gap-3">
              <span className="text-[#9DFFAB]">&#10004;</span>
              <span>Remote Access & Alerts</span>
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-14 bg-[#1B211A]/85 px-4 py-4 text-center text-sm text-white backdrop-blur-sm">
        © 2026 CCTV Secure. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Landing;


