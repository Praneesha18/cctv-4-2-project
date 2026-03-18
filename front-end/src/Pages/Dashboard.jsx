import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { getAuthUser, getSearchHistory, isAuthenticated } from "../lib/auth";

function formatBytes(bytes) {
  if (!bytes) {
    return "Not available";
  }

  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
}

function formatHistoryDate(value) {
  if (!value) {
    return "Saved earlier";
  }

  return new Date(value).toLocaleString();
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    completedAnalyses: 0,
    failedAnalyses: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [error, setError] = useState("");
  const user = getAuthUser();
  const previousQueries = useMemo(() => getSearchHistory(), []);
  const latestAnalysis = recentAnalyses[0] || null;
  const successRate = stats.totalAnalyses
    ? Math.round((stats.completedAnalyses / stats.totalAnalyses) * 100)
    : 0;

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    apiRequest("/api/video/dashboard")
      .then((data) => {
        setStats(data.stats || {});
        setRecentAnalyses(data.recentAnalyses || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard");
      });
  }, []);

  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-card rounded-[28px] px-6 py-7 sm:px-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/62">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Monitor uploads, investigation progress, and recent activity.</h1>
          {user && (
            <p className="mt-3 text-sm text-white/68">
              Signed in as <span className="font-semibold text-[#DFFFE2]">{user.name || user.email}</span>
            </p>
          )}
        </section>

        {!isAuthenticated() && (
          <section className="mt-6 rounded-[24px] border border-red-300/30 bg-[#08130D]/65 px-6 py-8 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
            <p className="text-white/85">Login is required to access your dashboard and history.</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-4 rounded-2xl border border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] px-4 py-2 text-sm font-semibold"
            >
              Go to Login
            </button>
          </section>
        )}

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="panel-card rounded-[24px] p-5">
            <p className="text-sm text-white/56">Total uploads</p>
            <p className="mt-2 text-3xl font-semibold text-[#DFFFE2]">{stats.totalAnalyses || 0}</p>
            <p className="mt-2 text-sm text-white/62">All analyses recorded for your account.</p>
          </div>
          <div className="panel-card rounded-[24px] p-5">
            <p className="text-sm text-white/56">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-[#CFFFD8]">{stats.completedAnalyses || 0}</p>
            <p className="mt-2 text-sm text-white/62">Ready to search and preview.</p>
          </div>
          <div className="panel-card rounded-[24px] p-5">
            <p className="text-sm text-white/56">Failed</p>
            <p className="mt-2 text-3xl font-semibold text-[#FFD1C7]">{stats.failedAnalyses || 0}</p>
            <p className="mt-2 text-sm text-white/62">Uploads that need a retry or review.</p>
          </div>
          <div className="panel-card rounded-[24px] p-5">
            <p className="text-sm text-white/56">Success rate</p>
            <p className="mt-2 text-3xl font-semibold text-[#DFFFE2]">{successRate}%</p>
            <p className="mt-2 text-sm text-white/62">Based on completed versus failed uploads.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-card rounded-[28px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/62">Recent uploads</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Latest analysis activity</h2>
              </div>
              <Link to="/video-input" className="app-button app-button-secondary text-sm">
                Upload another video
              </Link>
            </div>

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            {!error && recentAnalyses.length === 0 && (
              <p className="mt-5 text-sm leading-6 text-white/72">
                No uploads yet. Start from the Video Input page to analyze footage and build your searchable history.
              </p>
            )}

            {recentAnalyses.length > 0 && (
              <div className="mt-6 space-y-4">
                {recentAnalyses.map((item) => (
                  <article key={item.id} className="panel-card rounded-[24px] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[#DFFFE2]">{item.originalFileName}</p>
                        <p className="mt-1 text-sm text-white/58">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="rounded-full border border-[#86F5A8]/25 bg-[#102317] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#CFFFD8]">
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/72">
                      <span className="rounded-full border border-white/8 bg-black/14 px-3 py-1.5">
                        {item.frameCount} sampled frames
                      </span>
                      <span className="rounded-full border border-white/8 bg-black/14 px-3 py-1.5">
                        {formatBytes(item.fileSize)}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/76">
                      {item.notes || "No notes were added for this upload."}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="surface-card rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/62">Input preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Most recent uploaded input</h2>
              {!latestAnalysis && (
                <p className="mt-4 text-sm leading-6 text-white/72">Upload a video to see a quick summary of the latest input here.</p>
              )}
              {latestAnalysis && (
                <div className="panel-card mt-5 space-y-4 rounded-[24px] p-5">
                  <div>
                    <p className="text-sm text-white/52">File name</p>
                    <p className="mt-1 text-base font-semibold text-[#DFFFE2]">{latestAnalysis.originalFileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/52">Notes</p>
                    <p className="mt-1 text-sm leading-6 text-white/76">
                      {latestAnalysis.notes || "No notes were attached to this upload."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="text-white/52">Frames sampled</p>
                      <p className="mt-1 font-semibold text-[#DFFFE2]">{latestAnalysis.frameCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/14 p-3">
                      <p className="text-white/52">Status</p>
                      <p className="mt-1 font-semibold text-[#DFFFE2]">{latestAnalysis.status}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="surface-card rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/62">Previous searches</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Recent query shortcuts</h2>
              {previousQueries.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-white/72">Run a few searches from the History page and your recent queries will appear here.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {previousQueries.map((entry) => (
                    <Link
                      key={entry.id}
                      to="/history"
                      className="panel-card flex items-center justify-between gap-3 rounded-[22px] p-4 transition hover:bg-white/8"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#E8F6E7]">{entry.query}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                          {formatHistoryDate(entry.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.18em] text-[#CFFFD8]">Open history</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
