import React from "react";

const History = () => {
  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">Post-Event Video Analysis and Retrieval Using Multimodal AI</h2>

        <section className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-[#7DDE86]/25 bg-[#08130D]/65 px-6 py-10 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
          <p className="text-white/85">
            No history data available right now.
            <br />
            This section will display user activity, login records, CCTV
            monitoring logs, or reports in the future.
          </p>

          <button className="mt-6 rounded-md border border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(98,255,152,0.3)] transition hover:brightness-110">
            Refresh
          </button>
        </section>
      </main>
    </div>
  );
};

export default History;

