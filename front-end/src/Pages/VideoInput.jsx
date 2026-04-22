import React, { useEffect, useState } from "react";
import { apiRequest, buildAuthorizedMediaUrl } from "../lib/api";
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

function stripFileExtension(fileName) {
  if (!fileName) {
    return "";
  }

  return fileName.replace(/\.[^/.]+$/, "");
}

const VideoInput = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [displayFileName, setDisplayFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadHistory = async (nextSelectedId = "") => {
    if (!isAuthenticated()) {
      setHistoryItems([]);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const data = await apiRequest("/api/video/history");
      const items = data.history || [];
      setHistoryItems(items);
      setSelectedHistoryId((currentId) => nextSelectedId || currentId || items[0]?.id || "");
    } catch (err) {
      setError(err.message || "Failed to load previous uploads.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
    setDisplayFileName(file ? stripFileExtension(file.name) : "");
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
      formData.append("displayFileName", displayFileName.trim());

      const data = await apiRequest("/api/video/ingest", {
        method: "POST",
        body: formData,
      });

      setStatus("Video analyzed successfully and added to your searchable history.");
      setAnalysis(data.analysis);
      setVideoFile(null);
      setDisplayFileName("");
      setNotes("");
      setIsDialogOpen(false);
      setSelectedHistoryId(data.analysis?.id || "");
      const input = document.getElementById("video-input-field");
      if (input) input.value = "";
      loadHistory(data.analysis?.id || "");
    } catch (err) {
      setError(err.message || "Failed to call backend.");
    } finally {
      setIsUploading(false);
    }
  };

  const selectedHistoryItem = historyItems.find((item) => item.id === selectedHistoryId) || null;

  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {!isAuthenticated() && (
          <section className="mb-6 rounded-[24px] border border-red-300/30 bg-[#08130D]/65 p-6 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
            <p className="text-white/90">Login is required before uploading a video.</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-4 rounded-2xl bg-[#8BAE66] px-4 py-2 text-sm font-semibold text-[#0B140C]"
            >
              Go to Login
            </button>
          </section>
        )}

        <section className="auth-shell">
          <section className="auth-shell-card auth-shell-card-no-orb px-2 py-4 sm:px-4 lg:px-6">
            <p className="eyebrow">Video Input</p>
            <h1 className="display-font mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#F7F4EB] sm:text-5xl">
              Upload footage, rename it clearly, and keep each analysis easy to review later.
            </h1>
            <p className="body-copy mt-5 max-w-2xl text-base sm:text-lg">
              Use a cleaner display name for each upload, add context notes, and preview previously ingested videos from one consistent workspace.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="panel-card rounded-[16px] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/44">
                  Better Labels
                </p>
                <p className="display-font mt-3 text-2xl font-semibold text-[#F7F4EB]">
                  Give each upload a readable name before it enters your searchable archive
                </p>
              </div>
              <div className="rounded-[16px] bg-secondary p-5 text-[#F8F3E9]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(248,243,233,0.56)]">
                  Quick Review
                </p>
                <p className="display-font mt-3 text-2xl font-semibold">
                  Preview recent uploads and inspect the latest analysis details without clutter
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] bg-deep p-7 text-white sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/46">Workspace</p>
                <h2 className="display-font mt-3 text-2xl font-semibold text-[#F7F4EB]">
                  Recent uploads and preview
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                disabled={!isAuthenticated()}
                className="app-button auth-submit-button shrink-0 disabled:opacity-60"
              >
                Ingest Video
              </button>
            </div>
          </section>
        </section>

        {status && (
          <div className="mt-6 rounded-[18px] bg-secondary px-5 py-4 text-sm font-semibold text-[#E9FFED]">
            {status}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[18px] bg-red-300/10 px-5 py-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="surface-card rounded-[24px] p-5 text-white sm:p-6">
            <p className="eyebrow">Preview Screen</p>
            <h2 className="mt-4 text-2xl font-semibold text-[#F7F4EB]">
              Previously ingested video
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/64">
              Click any item from the right side to update the preview and the ingestion details below.
            </p>

            <div className="mt-6 overflow-hidden rounded-[22px] bg-[#08130D]">
              {isHistoryLoading ? (
                <div className="px-6 py-10 text-center text-sm text-white/46">
                  Loading recent uploads...
                </div>
              ) : selectedHistoryItem ? (
                <video
                  key={selectedHistoryItem.id}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black object-cover"
                  src={buildAuthorizedMediaUrl(selectedHistoryItem.videoStreamPath)}
                />
              ) : (
                <div className="px-6 py-10 text-center text-sm text-white/46">
                  No previous ingested videos to preview yet.
                </div>
              )}
            </div>

            {selectedHistoryItem && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
                <p className="text-lg font-semibold text-[#DFFFE2]">Ingestion details</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#08130D]/70 p-4">
                    <p className="text-white/55">Video</p>
                      <p className="text-wrap-balanced mt-1 font-semibold text-white">{selectedHistoryItem.originalFileName}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08130D]/70 p-4">
                    <p className="text-white/55">Status</p>
                    <p className="mt-1 font-semibold text-white">{selectedHistoryItem.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08130D]/70 p-4">
                    <p className="text-white/55">Sampled frames</p>
                    <p className="mt-1 font-semibold text-white">{selectedHistoryItem.frameCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08130D]/70 p-4 sm:col-span-2">
                    <p className="text-white/55">Created</p>
                    <p className="mt-1 font-semibold text-white">
                      {new Date(selectedHistoryItem.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#08130D]/70 p-4 sm:col-span-2">
                    <p className="text-white/55">Notes</p>
                    <p className="mt-2 text-sm leading-7 text-white/78">
                      {selectedHistoryItem.notes || "No notes added for this upload."}
                    </p>
                  </div>
                </div>
                <Link
                  to="/history"
                  className="mt-4 inline-block font-semibold text-[#9DFFAB] underline underline-offset-4"
                >
                  View history
                </Link>
              </div>
            )}
          </section>

          <aside className="surface-card rounded-[24px] p-5 text-white sm:p-6">
            <p className="eyebrow">Recent Uploads</p>
            <h2 className="mt-4 text-2xl font-semibold text-[#F7F4EB]">
              Video list
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/64">
              Select any recent upload to load it into the preview screen.
            </p>

            {historyItems.length > 0 ? (
              <div className="mt-6 max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {historyItems.map((item) => {
                  const isSelected = item.id === selectedHistoryId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedHistoryId(item.id)}
                      className={`w-full rounded-2xl px-4 py-4 text-left transition-colors ${
                        isSelected ? "bg-secondary" : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-wrap-balanced font-semibold text-white">{item.originalFileName}</p>
                          <p className="mt-1 text-sm leading-6 text-white/62">
                            {item.notes || "No notes added for this upload."}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs uppercase tracking-[0.18em] text-white/48">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[22px] bg-[#08130D] px-6 py-10 text-center text-sm text-white/46">
                No previous ingested videos to preview yet.
              </div>
            )}
          </aside>
        </section>

      </main>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-[#0B1911] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.38)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Ingest Video</p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F7F4EB]">
                  Add a new video for semantic search
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/64">
                  Select a video, choose a cleaner display name, and add notes before ingestion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70"
              >
                Close
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
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
                  <div className="mt-3 rounded-2xl border border-white/10 bg-[#08130D]/70 p-4 text-sm text-white/80">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Detected file</p>
                    <p className="text-wrap-balanced mt-2 font-semibold text-[#DFFFE2]">{videoFile.name}</p>
                    <p className="mt-2">Selected file size: {formatBytes(videoFile.size)}</p>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="display-file-name"
                  className="mb-2 block text-base font-medium text-[#DFFFE2]"
                >
                  Display Name
                </label>
                <input
                  id="display-file-name"
                  type="text"
                  value={displayFileName}
                  onChange={(e) => setDisplayFileName(e.target.value)}
                  disabled={!isAuthenticated()}
                  placeholder="Front gate incident - evening shift"
                  className="app-input"
                />
                <p className="mt-2 text-sm text-white/55">
                  This name will be shown in history and search results instead of the raw upload filename.
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
                  rows={5}
                  disabled={!isAuthenticated()}
                  placeholder="Add context for analysis..."
                  className="app-input"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="app-button app-button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !isAuthenticated()}
                  className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUploading ? "Uploading..." : "Ingest Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInput;
