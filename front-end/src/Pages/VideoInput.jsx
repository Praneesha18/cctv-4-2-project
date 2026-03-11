import React, { useState } from "react";
import { API_BASE_URL } from "../lib/api";

const VideoInput = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);
    setStatus("");
    setError("");
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

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("notes", notes);

      const response = await fetch(`${API_BASE_URL}/api/video/ingest`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setStatus(
        `Upload received by backend (${data.bytesReceived || 0} bytes).`
      );
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
        <section className="rounded-[24px] border border-[#7DDE86]/25 bg-[#08130D]/65 p-8 shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
          <h1 className="text-center text-2xl font-semibold sm:text-3xl">
            Video Input
          </h1>
          <p className="mt-3 text-center text-sm text-white/80 sm:text-base">
            Upload a video for post-event analysis and retrieval.
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
                className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-4 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-[#2B7D37] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#379446]"
              />
              {videoFile && (
                <p className="mt-2 text-sm text-white/75">
                  Selected: {videoFile.name} ({Math.ceil(videoFile.size / 1024)} KB)
                </p>
              )}
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
                placeholder="Add context for analysis..."
                className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full rounded-2xl border border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] px-4 py-3 text-xl font-semibold text-white shadow-[0_0_20px_rgba(98,255,152,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
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
          </form>
        </section>
      </main>
    </div>
  );
};

export default VideoInput;
