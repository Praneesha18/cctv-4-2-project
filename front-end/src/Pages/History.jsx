import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, buildAuthorizedMediaUrl } from "../lib/api";
import { addSearchHistory, getSearchHistory, isAuthenticated } from "../lib/auth";

function formatTimestamp(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatHistoryDate(value) {
  if (!value) {
    return "Saved earlier";
  }

  return new Date(value).toLocaleString();
}

const SearchResultCard = ({ item, isLowConfidence = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const hasInitializedPreviewRef = useRef(false);
  const startSeconds = Number(item.matchedInterval?.startSeconds || 0);
  const endSeconds = Math.max(
    startSeconds,
    Number(item.matchedInterval?.endSeconds || startSeconds),
  );
  const previewStartSeconds = Math.min(
    endSeconds,
    Math.max(
      startSeconds,
      Number(item.matchedFrame?.timestampSeconds ?? startSeconds),
    ),
  );
  const previewUrl = buildAuthorizedMediaUrl(item.analysis.videoStreamPath);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    hasInitializedPreviewRef.current = false;

    const seekToPreviewStart = () => {
      video.pause();
      video.currentTime = previewStartSeconds;
      setIsPlaying(false);
    };

    const initializePreview = () => {
      if (hasInitializedPreviewRef.current) {
        return;
      }

      seekToPreviewStart();
      hasInitializedPreviewRef.current = true;
    };

    const stopAtRangeEnd = () => {
      if (video.currentTime >= endSeconds) {
        video.pause();
        video.currentTime = endSeconds;
        setIsPlaying(false);
      }
    };

    video.addEventListener("loadedmetadata", initializePreview);
    video.addEventListener("canplay", initializePreview);
    video.addEventListener("timeupdate", stopAtRangeEnd);

    if (video.readyState >= 1) {
      initializePreview();
    }

    return () => {
      video.removeEventListener("loadedmetadata", initializePreview);
      video.removeEventListener("canplay", initializePreview);
      video.removeEventListener("timeupdate", stopAtRangeEnd);
      video.pause();
      setIsPlaying(false);
    };
  }, [endSeconds, previewStartSeconds]);

  const playMatchedRange = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.currentTime < startSeconds || video.currentTime >= endSeconds) {
      video.currentTime = previewStartSeconds;
    }

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const replayMatchedRange = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    video.currentTime = previewStartSeconds;

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const pauseMatchedRange = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  return (
    <article className="surface-card overflow-hidden rounded-[28px]">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#8AD8A2]/70">Matched interval</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{item.analysis.originalFileName}</h3>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.analysis.notes || "No notes added for this video."}</p>
            {isLowConfidence && (
              <p className="mt-3 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                Low confidence match
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[220px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-white/55">Match score</p>
              <p className="mt-1 font-semibold text-[#CFFFD8]">{item.score.toFixed(3)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-white/55">Matched interval</p>
              <p className="mt-1 font-semibold text-[#CFFFD8]">
                {formatTimestamp(item.matchedInterval?.startSeconds)} to {formatTimestamp(item.matchedInterval?.endSeconds)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-white/75">
          <span className="rounded-full border border-[#86F5A8]/25 bg-[#102317] px-3 py-1.5">
            Uploaded {new Date(item.analysis.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
          <video
            ref={videoRef}
            preload="metadata"
            src={previewUrl}
            className="aspect-video w-full bg-black"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#08130D] px-4 py-3">
            <div className="text-sm text-white/70">
              Previewing matched frame at {formatTimestamp(previewStartSeconds)} within {formatTimestamp(startSeconds)}-{formatTimestamp(endSeconds)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={isPlaying ? pauseMatchedRange : playMatchedRange}
                className="app-button app-button-secondary text-sm"
              >
                {isPlaying ? "Pause" : "Play matched range"}
              </button>
              <button
                type="button"
                onClick={replayMatchedRange}
                className="app-button app-button-secondary text-sm"
              >
                Replay
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const HistoryVideoCard = ({ item }) => {
  return (
    <article className="surface-card overflow-hidden rounded-[24px]">
      <div className="p-4 sm:p-5">
        <div className="text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-[#DFFFE2]">{item.originalFileName}</p>
              <p className="mt-1 text-sm text-white/70">Created: {new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full border border-[#86F5A8]/25 bg-[#102317] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#CFFFD8]">
              {item.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/75">
            <span className="rounded-full border border-[#86F5A8]/25 bg-[#102317] px-3 py-1.5">
              {item.frameCount} sampled frames
            </span>
          </div>

          <p className="mt-4 text-sm text-white/80">Notes: {item.notes || "No notes"}</p>
          {item.errorMessage && <p className="mt-2 text-sm text-red-300">{item.errorMessage}</p>}
        </div>
      </div>
    </article>
  );
};

const SearchDebugPanel = ({ debug }) => {
  if (!debug) {
    return null;
  }

  return (
    <section className="mt-6 rounded-[22px] border border-amber-200/20 bg-[linear-gradient(180deg,rgba(47,34,14,0.58),rgba(24,18,8,0.62))] p-5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-amber-200/65">Search debug</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Raw retrieval before interval filtering</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[280px]">
          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <p className="text-white/55">Raw matches</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.rawMatchCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <p className="text-white/55">Returned</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.returnedCount ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/75">
        <span className="rounded-full border border-amber-200/20 bg-[#2A210F] px-3 py-1.5">
          Interval threshold {Number(debug.minIntervalScore ?? 0).toFixed(2)}
        </span>
        <span className="rounded-full border border-amber-200/20 bg-[#2A210F] px-3 py-1.5">
          Avg interval threshold {Number(debug.minAverageIntervalScore ?? 0).toFixed(2)}
        </span>
        <span className="rounded-full border border-amber-200/20 bg-[#2A210F] px-3 py-1.5">
          Single-frame threshold {Number(debug.minSingleFrameScore ?? 0).toFixed(2)}
        </span>
      </div>

      <p className="mt-5 text-sm text-white/65">
        Returned results are merged time intervals, not raw frame-by-frame matches.
      </p>
    </section>
  );
};

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [results, setResults] = useState([]);
  const [previousQueries, setPreviousQueries] = useState([]);
  const [searchDebug, setSearchDebug] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleUsePreviousQuery = (previousQuery) => {
    setQuery(previousQuery);
    setStatus(`Loaded previous search: "${previousQuery}"`);
    setError("");
  };

  const loadHistory = () => {
    apiRequest("/api/video/history")
      .then((data) => {
        setHistory(data.history || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load history");
      });
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    setPreviousQueries(getSearchHistory());
    loadHistory();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setSearchDebug(null);
    setHasSearched(true);

    try {
      const trimmedQuery = query.trim();
      const data = await apiRequest("/api/video/search", {
        method: "POST",
        body: JSON.stringify({ query: trimmedQuery, limit: 5 }),
      });

      setPreviousQueries(addSearchHistory(trimmedQuery));
      setResults(data.results || []);
      setSearchDebug(data.debug || null);
      setStatus(`Found ${data.results?.length || 0} similar result(s).`);
    } catch (err) {
      setError(err.message || "Search failed");
      setResults([]);
      setSearchDebug(null);
    }
  };

  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">Post-Event Video Analysis and Retrieval Using Multimodal AI</h2>

        {!isAuthenticated() && (
          <section className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-red-300/30 bg-[#08130D]/65 px-6 py-10 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
            <p className="text-white/85">Login is required to view your history.</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 rounded-md border border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(98,255,152,0.3)] transition hover:brightness-110"
            >
              Go to Login
            </button>
          </section>
        )}

        {isAuthenticated() && (
          <section className="surface-card mx-auto mt-8 max-w-3xl rounded-[28px] px-6 py-8 sm:px-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/64">Search</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Find the right moment faster</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                  Describe the scene in plain language. Results will show a match score and preview from the matched part of the video.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
                Stored videos: <span className="font-semibold text-[#DFFFE2]">{history.length}</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSearch}>
              <label className="block text-sm font-medium text-[#DFFFE2]" htmlFor="semantic-search">
                Search across your stored videos
              </label>
              <input
                id="semantic-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="person in red shirt running near entrance"
                className="app-input"
              />
              <button className="app-button app-button-primary text-sm">
                Search videos
              </button>
            </form>

            {previousQueries.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white/72">Query history</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Last {previousQueries.length} searches</p>
                </div>
                <div className="mt-3 space-y-3">
                  {previousQueries.map((entry) => (
                    <div key={entry.id} className="panel-card flex flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#E8F6E7]">{entry.query}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                          {formatHistoryDate(entry.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUsePreviousQuery(entry.query)}
                        className="app-button app-button-secondary text-sm"
                      >
                        Use this query
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status && <p className="mt-4 text-sm text-[#B7FFC1]">{status}</p>}
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            <SearchDebugPanel debug={searchDebug} />

            {hasSearched && !error && results.length === 0 && (
              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75">
                No matching intervals were returned for this query. Check the debug panel above to see whether raw matches were found and filtered out.
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-6 space-y-5">
                {results.map((item) => (
                  <SearchResultCard
                    key={item.matchId || `${item.analysis.id}-${item.matchedInterval?.startFrameIndex}`}
                    item={item}
                    isLowConfidence={Boolean(searchDebug?.fallbackApplied)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="surface-card mx-auto mt-8 max-w-3xl rounded-[28px] px-6 py-10 text-center">
          {history.length === 0 ? (
            <p className="text-white/85">
              No history data available right now.
              <br />
              Upload a video after login to create user-scoped history.
            </p>
          ) : (
            <div className="space-y-4 text-left">
              {history.map((item) => (
                <HistoryVideoCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={loadHistory}
            className="app-button app-button-primary mt-6 text-sm"
          >
            Refresh
          </button>
        </section>
      </main>
    </div>
  );
};

export default History;
