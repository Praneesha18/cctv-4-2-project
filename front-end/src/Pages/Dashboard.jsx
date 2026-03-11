import React from "react";

const Dashboard = () => {
  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[20px] border border-[#7DDE86]/25 bg-[#08130D]/65 px-5 py-4 text-white shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
          <h2 className="text-lg font-semibold sm:text-xl">
            Post-Event Video Analysis and Retrieval Using Multimodal AI
          </h2>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[20px] border border-[#7DDE86]/25 bg-[#08130D]/65 p-5 text-center shadow-[0_0_30px_rgba(73,255,133,0.1)] backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white/95">Total Cameras</h3>
            <p className="mt-2 text-2xl font-bold text-[#9DFFAB]">--</p>
          </div>

          <div className="rounded-[20px] border border-[#7DDE86]/25 bg-[#08130D]/65 p-5 text-center shadow-[0_0_30px_rgba(73,255,133,0.1)] backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white/95">Active Cameras</h3>
            <p className="mt-2 text-2xl font-bold text-[#9DFFAB]">--</p>
          </div>

          <div className="rounded-[20px] border border-[#7DDE86]/25 bg-[#08130D]/65 p-5 text-center shadow-[0_0_30px_rgba(73,255,133,0.1)] backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white/95">Alerts Today</h3>
            <p className="mt-2 text-2xl font-bold text-[#9DFFAB]">--</p>
          </div>

          <div className="rounded-[20px] border border-[#7DDE86]/25 bg-[#08130D]/65 p-5 text-center shadow-[0_0_30px_rgba(73,255,133,0.1)] backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white/95">Storage Used</h3>
            <p className="mt-2 text-2xl font-bold text-[#9DFFAB]">--</p>
          </div>
        </section>

        <section className="mt-8 rounded-[24px] border border-[#7DDE86]/25 bg-[#08130D]/65 px-6 py-8 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
          <h3 className="text-xl font-semibold text-white">No Data Available</h3>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">
            Dashboard analytics, camera feeds, alerts, and reports will be
            displayed here once the system is connected to backend and database.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

