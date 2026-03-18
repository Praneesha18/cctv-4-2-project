import React, { useState } from "react";
import { apiRequest } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";

function formatBytes(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VideoInput = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [fps, setFps] = useState("2");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
    setStatus("");
    setError("");
    setAnalysis(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      setError("Please select a video file first.");
      setStatus("");
      return;
    }

    setIsUploading(true);
    setError("");
    setStatus("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("notes", notes);
      formData.append("fps", fps);

      const data = await apiRequest("/api/video/ingest", {
        method: "POST",
        body: formData,
      });

      setStatus(`Video analyzed successfully. Your upload is now available in history.`);
      setAnalysis(data.analysis);
      setVideoFile(null);
      setNotes("");
      const input = document.getElementById("video-input-field");
      if (input) input.value = "";
    } catch (err) {
      setError(err.message || "Failed to call backend.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {!isAuthenticated() && (
          <section className="mb-6 rounded-[24px] border border-red-300/30 bg-[#08130D]/65 p-6 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
            <p className="text-white/90">Login is required before uploading a video.</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-4 rounded-2xl border border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] px-4 py-2 text-sm font-semibold"
            >
              Go to Login
            </button>
          </section>
        )}

        <section className="surface-card rounded-[28px] p-8">
          <h1 className="display-font text-center text-2xl font-semibold sm:text-3xl">
            Video Input
          </h1>
          <p className="body-copy mt-3 text-center text-sm sm:text-base">
            Upload a video, add optional investigation notes, and prepare it for semantic search.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="video-input-field"
                className="mb-2 block text-base font-medium text-[#DFFFE2]"
              >
                Video File
              </label>
              <input
                id="video-input-field"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={!isAuthenticated()}
                className="app-input text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#2B7D37] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#379446]"
              />
              {videoFile && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <p className="font-semibold text-[#DFFFE2]">{videoFile.name}</p>
                  <p className="mt-1">Selected file size: {formatBytes(videoFile.size)}</p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="fps"
                className="mb-2 block text-base font-medium text-[#DFFFE2]"
              >
                Sampling FPS
              </label>
              <input
                id="fps"
                type="number"
                min="1"
                max="10"
                step="1"
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                disabled={!isAuthenticated()}
                className="app-input"
              />
              <p className="mt-2 text-sm text-white/60">
                Higher values sample more frames and usually improve search for short events.
              </p>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-base font-medium text-[#DFFFE2]"
              >
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={!isAuthenticated()}
                placeholder="Add context for analysis..."
                className="app-input"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !isAuthenticated()}
              className="app-button app-button-primary w-full text-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUploading ? "Uploading..." : "Ingest Video"}
            </button>

            {status && (
              <p className="text-center text-sm font-semibold text-[#B7FFC1]">
                {status}
              </p>
            )}

            {error && (
              <p className="text-center text-sm font-semibold text-red-300">{error}</p>
            )}

            {analysis && (
              <div className="rounded-2xl border border-[#7DDE86]/25 bg-[#0B1911]/70 p-5 text-sm text-white/90">
                <p className="text-lg font-semibold text-[#DFFFE2]">Upload summary</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-white/55">Video</p>
                    <p className="mt-1 font-semibold text-white">{analysis.originalFileName}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-white/55">Status</p>
                    <p className="mt-1 font-semibold text-white">{analysis.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-white/55">Sampled frames</p>
                    <p className="mt-1 font-semibold text-white">{analysis.frameCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-white/55">Created</p>
                    <p className="mt-1 font-semibold text-white">{new Date(analysis.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <Link to="/history" className="mt-3 inline-block font-semibold text-[#9DFFAB] underline underline-offset-4">
                  View history
                </Link>
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
  );
};

export default VideoInput;
