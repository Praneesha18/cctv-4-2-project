import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, buildAuthorizedMediaUrl } from "../lib/api";
import {
  addSearchHistory,
  getSearchHistory,
  isAuthenticated,
  removeSearchHistoryEntry,
} from "../lib/auth";
import { useToast } from "../lib/toast-context";

const FRAME_RESULTS_PAGE_SIZE = 5;
const VIDEO_HISTORY_PAGE_SIZE = 5;

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

function formatSoftmaxRow(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "[]";
  }

  return `[${values.map((value) => Number(Number(value || 0).toFixed(6))).join(", ")}]`;
}

function formatSearchPath(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "none";
  }

  return values.join(" -> ");
}

function getMatchBadgeClasses(matchBand) {
  if (matchBand === "high") {
    return "bg-secondary text-[#CFFFD8]";
  }

  if (matchBand === "medium") {
    return "bg-sky-300/10 text-sky-100";
  }

  return "bg-amber-300/10 text-amber-100";
}

function getMatchPresentation(score) {
  const numericScore = Number(score) || 0;

  if (numericScore > 0.3) {
    return {
      matchBand: "high",
      matchLabel: "Highly matched",
    };
  }

  if (numericScore >= 0.28) {
    return {
      matchBand: "medium",
      matchLabel: "Moderately matched",
    };
  }

  return {
    matchBand: "poor",
    matchLabel: "Poorly matched",
  };
}

const SearchResultCard = ({ item, isLowConfidence = false, resultType = "segment" }) => {
  const isFrameResult = resultType === "frame";
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
  const matchedImageUrl = item.matchedFrame?.previewPath
    ? buildAuthorizedMediaUrl(item.matchedFrame.previewPath)
    : "";
  const matchPresentation = item.matchBand
    ? {
        matchBand: item.matchBand,
        matchLabel: item.matchLabel,
      }
    : getMatchPresentation(item.score);
  const matchPercentage = (Number(item.probability || 0) * 100).toFixed(2);

  if (isFrameResult) {
    return (
      <article className="surface-card group overflow-hidden rounded-[26px] border border-white/8">
        <div className="relative overflow-hidden bg-black/40">
          {matchedImageUrl ? (
            <img
              src={matchedImageUrl}
              alt={`Matched frame ${item.matchedFrame?.frameIndex ?? ""}`}
              className="aspect-video w-full bg-black object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-black text-sm text-white/45">
              No matched frame preview
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E8F6E7] backdrop-blur-sm">
              Matched frame
            </span>
            <div className="rounded-[18px] border border-[#9ED7A8]/20 bg-[linear-gradient(135deg,rgba(159,214,138,0.95),rgba(214,255,220,0.82))] px-3 py-2 text-right text-[#08200D] shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Match</p>
              <p className="text-lg font-bold leading-none">{matchPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9ED7A8]/64">Video</p>
              <h3 className="mt-1 truncate text-base font-semibold text-white">
                {item.analysis.originalFileName}
              </h3>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getMatchBadgeClasses(matchPresentation.matchBand)}`}
            >
              {matchPresentation.matchLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Timestamp</p>
              <p className="mt-1 text-sm font-semibold text-[#DFFFE2]">
                {formatTimestamp(previewStartSeconds)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Frame</p>
              <p className="mt-1 text-sm font-semibold text-[#DFFFE2]">
                #{item.matchedFrame?.frameIndex ?? 0}
              </p>
            </div>
          </div>

          {isLowConfidence && (
            <p className="rounded-2xl bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              Fallback result
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="surface-card overflow-hidden rounded-[28px]">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#8AD8A2]/70">
              {isFrameResult ? "Matched frame" : "Matched segment"}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">{item.analysis.originalFileName}</h3>
            <p className="mt-2 text-sm leading-6 text-white/72">{item.analysis.notes || "No notes added for this video."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <p
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getMatchBadgeClasses(matchPresentation.matchBand)}`}
              >
                {matchPresentation.matchLabel}
              </p>
              {isLowConfidence && (
                <p className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                  Fallback result
                </p>
              )}
            </div>
          </div>
          <div className={`grid gap-3 text-sm ${isFrameResult ? "grid-cols-2 sm:min-w-[260px]" : "grid-cols-1 sm:min-w-[180px]"}`}>
            <div className="rounded-2xl bg-white/5 px-4 py-3">
              <p className="text-white/55">Softmax prob</p>
              <p className="mt-1 font-semibold text-[#CFFFD8]">
                {matchPercentage}%
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-white/75">
          <span className="rounded-full bg-secondary px-3 py-1.5">
            Uploaded {new Date(item.analysis.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
          <div className="overflow-hidden rounded-[22px] bg-black/30">
            {matchedImageUrl ? (
              <img
                src={matchedImageUrl}
                alt={`Matched frame ${item.matchedFrame?.frameIndex ?? ""}`}
                className="aspect-video w-full bg-black object-cover"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-black text-sm text-white/45">
                No matched frame preview
            </div>
          )}
            <div className="bg-[#08130D] px-4 py-3 text-sm text-white/70">
              {isFrameResult
                ? `Frame ${item.matchedFrame?.frameIndex ?? 0} at ${formatTimestamp(previewStartSeconds)}`
                : `Matched preview at ${formatTimestamp(previewStartSeconds)} within ${formatTimestamp(startSeconds)}-${formatTimestamp(endSeconds)}`}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const HistoryVideoCard = ({ item, onDelete, isDeleting = false }) => {
  const previewUrl = buildAuthorizedMediaUrl(item.videoStreamPath);

  return (
    <article className="surface-card overflow-hidden rounded-[24px]">
      <div className="overflow-hidden bg-black/30">
        <video
          preload="metadata"
          controls
          src={previewUrl}
          className="aspect-video w-full bg-black"
        />
      </div>
      <div className="p-4 sm:p-5">
        <div className="text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-[#DFFFE2]">{item.originalFileName}</p>
              <p className="mt-1 text-sm text-white/70">Created: {new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#CFFFD8]">
              {item.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/75">
            <span className="rounded-full bg-secondary px-3 py-1.5">
              {item.frameCount} sampled frames
            </span>
          </div>

          <p className="mt-4 text-sm text-white/80">Notes: {item.notes || "No notes"}</p>
          {item.errorMessage && <p className="mt-2 text-sm text-red-300">{item.errorMessage}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDelete(item)}
              disabled={isDeleting}
              className="rounded-2xl bg-red-300/10 px-4 py-2 text-sm font-semibold text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete video"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

const SearchDebugPanel = ({ debug }) => {
  if (!debug) {
    return null;
  }

  const coarseSoftmaxRow = formatSoftmaxRow(debug.coarseSoftmaxSorted);
  const frameSoftmaxRow = formatSoftmaxRow(debug.frameSoftmaxSorted);
  const segmentSoftmaxRow = formatSoftmaxRow(debug.segmentSoftmaxSorted);
  const searchedPointTypes = Array.isArray(debug.stage2?.searchedPointTypes)
    ? debug.stage2.searchedPointTypes.join(", ")
    : "";
  const queryTypeLabel = String(debug.queryType || debug.pipeline?.mode || "unknown").replaceAll("_", " ");
  const searchPathLabel = formatSearchPath(debug.searchPath);
  const coarseLabel = debug.stage1?.pointType === "frame"
    ? "Stage 1 frame softmax"
    : "Stage 1 window softmax";

  return (
    <section className="mt-6 rounded-[22px] bg-secondary p-5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-amber-200/65">Search debug</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Two-stage retrieval pipeline</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[320px]">
          <div className="rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-white/55">Stage 1 candidates</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.coarseMatchCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-white/55">Candidate videos</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.stage1?.candidateAnalysisIds?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-white/55">Frame matches</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.frameMatchCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-white/55">Window matches</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.windowMatchCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-white/55">Raw matches</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.rawMatchCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-black/15 px-4 py-3">
            <p className="text-white/55">Returned</p>
            <p className="mt-1 font-semibold text-amber-100">{debug.returnedCount ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/75">
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Query type: {queryTypeLabel}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Search path: {searchPathLabel}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Stage 1: {debug.stage1?.pointType || "video"}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Stage 2: {searchedPointTypes || "none"}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Top-K {Number(debug.topK ?? 0)}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Coarse Top-K {Number(debug.coarseTopK ?? 0)}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Score max {Number(debug.maxScore ?? 0).toFixed(3)}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Score min {Number(debug.minScore ?? 0).toFixed(3)}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Abs diff {Number(debug.absoluteScoreSpread ?? 0).toFixed(3)}
        </span>
        <span className="rounded-full bg-[#2A210F] px-3 py-1.5">
          Scale {Number(debug.logitScale ?? 0)}
        </span>
      </div>

      <p className="mt-5 text-sm text-white/65">
        This panel shows how the backend classified the query and whether it searched frames, windows, or used the mixed two-stage path.
      </p>

      <div className="mt-5 rounded-[20px] bg-black/15 p-4 text-sm text-white/80">
        <p className="font-semibold text-white">Query classification</p>
        <p className="mt-2">
          <span className="text-white/55">Query:</span> {debug.query || "N/A"}
        </p>
        <p className="mt-1">
          <span className="text-white/55">Object tokens:</span>{" "}
          {debug.pipeline?.objectTokens?.length ? debug.pipeline.objectTokens.join(", ") : "none"}
        </p>
        <p className="mt-1">
          <span className="text-white/55">Action tokens:</span>{" "}
          {debug.pipeline?.actionTokens?.length ? debug.pipeline.actionTokens.join(", ") : "none"}
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-[20px] bg-black/15 p-4">
          <p className="text-sm font-semibold text-white">{coarseLabel}</p>
          <textarea
            readOnly
            value={coarseSoftmaxRow}
            className="mt-3 min-h-[96px] w-full rounded-2xl border border-white/10 bg-[#08130D] px-4 py-3 font-mono text-xs leading-6 text-[#DFFFE2] outline-none"
          />
        </div>
        <div className="rounded-[20px] bg-black/15 p-4">
          <p className="text-sm font-semibold text-white">Frame softmax</p>
          <textarea
            readOnly
            value={frameSoftmaxRow}
            className="mt-3 min-h-[96px] w-full rounded-2xl border border-white/10 bg-[#08130D] px-4 py-3 font-mono text-xs leading-6 text-[#DFFFE2] outline-none"
          />
        </div>
        <div className="rounded-[20px] bg-black/15 p-4">
          <p className="text-sm font-semibold text-white">Segment softmax</p>
          <textarea
            readOnly
            value={segmentSoftmaxRow}
            className="mt-3 min-h-[96px] w-full rounded-2xl border border-white/10 bg-[#08130D] px-4 py-3 font-mono text-xs leading-6 text-[#DFFFE2] outline-none"
          />
        </div>
      </div>
    </section>
  );
};

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [segmentResults, setSegmentResults] = useState([]);
  const [frameResults, setFrameResults] = useState([]);
  const [previousQueries, setPreviousQueries] = useState([]);
  const [searchDebug, setSearchDebug] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchRunId, setSearchRunId] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [deletingAnalysisId, setDeletingAnalysisId] = useState("");
  const [segmentResultsPage, setSegmentResultsPage] = useState(1);
  const [frameResultsPage, setFrameResultsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const { showToast } = useToast();

  const dedupedGroupedResults = segmentResults;
  const totalSegmentPages = Math.max(1, Math.ceil(dedupedGroupedResults.length / FRAME_RESULTS_PAGE_SIZE));
  const currentSegmentPage = Math.min(segmentResultsPage, totalSegmentPages);
  const visibleSegmentResults = dedupedGroupedResults.slice(
    (currentSegmentPage - 1) * FRAME_RESULTS_PAGE_SIZE,
    currentSegmentPage * FRAME_RESULTS_PAGE_SIZE,
  );
  const visibleSegmentRangeStart = dedupedGroupedResults.length === 0
    ? 0
    : (currentSegmentPage - 1) * FRAME_RESULTS_PAGE_SIZE + 1;
  const visibleSegmentRangeEnd = Math.min(
    currentSegmentPage * FRAME_RESULTS_PAGE_SIZE,
    dedupedGroupedResults.length,
  );
  const totalFramePages = Math.max(1, Math.ceil(frameResults.length / FRAME_RESULTS_PAGE_SIZE));
  const currentFramePage = Math.min(frameResultsPage, totalFramePages);
  const visibleFrameResults = frameResults.slice(
    (currentFramePage - 1) * FRAME_RESULTS_PAGE_SIZE,
    currentFramePage * FRAME_RESULTS_PAGE_SIZE,
  );
  const visibleFrameRangeStart = frameResults.length === 0
    ? 0
    : (currentFramePage - 1) * FRAME_RESULTS_PAGE_SIZE + 1;
  const visibleFrameRangeEnd = Math.min(
    currentFramePage * FRAME_RESULTS_PAGE_SIZE,
    frameResults.length,
  );
  const totalSampledFrames = history.reduce((sum, item) => sum + Number(item.frameCount || 0), 0);
  const totalHistoryPages = Math.max(1, Math.ceil(history.length / VIDEO_HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const visibleHistory = history.slice(
    (currentHistoryPage - 1) * VIDEO_HISTORY_PAGE_SIZE,
    currentHistoryPage * VIDEO_HISTORY_PAGE_SIZE,
  );
  const visibleHistoryRangeStart = history.length === 0
    ? 0
    : (currentHistoryPage - 1) * VIDEO_HISTORY_PAGE_SIZE + 1;
  const visibleHistoryRangeEnd = Math.min(
    currentHistoryPage * VIDEO_HISTORY_PAGE_SIZE,
    history.length,
  );

  const handleUsePreviousQuery = (previousQuery) => {
    setQuery(previousQuery);
    setError("");
    showToast(`Loaded previous search: "${previousQuery}"`, "info");
  };

  const handleDeleteQuery = (entryId) => {
    setPreviousQueries(removeSearchHistoryEntry(entryId));
    setError("");
    showToast("Saved query deleted.", "success");
  };

  const loadHistory = () => {
    apiRequest("/api/video/history")
      .then((data) => {
        const nextHistory = data.history || [];
        setHistory(nextHistory);
        setHistoryPage((page) => Math.min(page, Math.max(1, Math.ceil(nextHistory.length / VIDEO_HISTORY_PAGE_SIZE))));
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
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Search query is required");
      setSegmentResults([]);
      setFrameResults([]);
      setSearchDebug(null);
      setHasSearched(true);
      return;
    }

    setError("");
    setSegmentResults([]);
    setSegmentResultsPage(1);
    setFrameResults([]);
    setFrameResultsPage(1);
    setSearchDebug(null);
    setHasSearched(true);
    setIsSearching(true);
    setSearchRunId((current) => current + 1);

    try {
      const data = await apiRequest("/api/video/search", {
        method: "POST",
        body: JSON.stringify({ query: trimmedQuery, includeRawMatches: true }),
      });

      const incomingFrameResults = data.matchedFrames || [];
      const incomingSegmentResults = data.matchedSegments || data.results || [];
      console.log(
        "[video-search] matchedFrames softmax sorted",
        incomingFrameResults
          .map((item) => Number(Number(item.probability || 0).toFixed(6)))
          .sort((left, right) => right - left),
      );
      console.log(
        "[video-search] matchedSegments softmax sorted",
        incomingSegmentResults
          .map((item) => Number(Number(item.probability || 0).toFixed(4)))
          .sort((left, right) => right - left),
      );

      setPreviousQueries(addSearchHistory(trimmedQuery));
      setFrameResults(incomingFrameResults);
      setFrameResultsPage(1);
      setSegmentResults(incomingSegmentResults);
      setSegmentResultsPage(1);
      setSearchDebug(data.debug || null);
      showToast(
        `Found ${incomingSegmentResults.length} segment result(s) and ${incomingFrameResults.length} frame result(s).`,
        "success",
      );
    } catch (err) {
      setError(err.message || "Search failed");
      setSegmentResults([]);
      setFrameResults([]);
      setSearchDebug(null);
      showToast(err.message || "Search failed", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteVideo = async (item) => {
    const confirmed = window.confirm(`Delete "${item.originalFileName}" and all related vectors?`);
    if (!confirmed) {
      return;
    }

    setDeletingAnalysisId(item.id);
    setError("");

    try {
      await apiRequest(`/api/video/${item.id}`, {
        method: "DELETE",
      });

      setHistory((current) => {
        const nextHistory = current.filter((entry) => entry.id !== item.id);
        const nextHistoryPages = Math.max(1, Math.ceil(nextHistory.length / VIDEO_HISTORY_PAGE_SIZE));
        setHistoryPage((page) => Math.min(page, nextHistoryPages));
        return nextHistory;
      });
      setSegmentResults((current) => {
        const nextSegmentResults = current.filter((entry) => entry.analysis.id !== item.id);
        const nextSegmentPages = Math.max(1, Math.ceil(nextSegmentResults.length / FRAME_RESULTS_PAGE_SIZE));
        setSegmentResultsPage((page) => Math.min(page, nextSegmentPages));
        return nextSegmentResults;
      });
      setFrameResults((current) => {
        const nextFrameResults = current.filter((entry) => entry.analysis.id !== item.id);
        const nextFramePages = Math.max(1, Math.ceil(nextFrameResults.length / FRAME_RESULTS_PAGE_SIZE));
        setFrameResultsPage((page) => Math.min(page, nextFramePages));
        return nextFrameResults;
      });
      showToast(`Deleted "${item.originalFileName}" and its stored vectors.`, "success");
    } catch (err) {
      setError(err.message || "Failed to delete video");
      showToast(err.message || "Failed to delete video", "error");
    } finally {
      setDeletingAnalysisId("");
    }
  };

  return (
    <div className="min-h-screen page-background text-white">
      <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center text-lg font-semibold text-white sm:text-xl">Post-Event Video Analysis and Retrieval Using Multimodal AI</h2>

        {!isAuthenticated() && (
          <section className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-red-300/30 bg-[#08130D]/65 px-6 py-10 text-center shadow-[0_0_40px_rgba(73,255,133,0.12)] backdrop-blur-md">
            <p className="text-white/85">Login is required to view your history.</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 rounded-md bg-[#8BAE66] px-5 py-2.5 text-sm font-semibold text-[#0B140C] shadow-[0_0_20px_rgba(98,255,152,0.18)]"
            >
              Go to Login
            </button>
          </section>
        )}

        {isAuthenticated() && (
          <>
            <section className="mt-8 space-y-6 px-1 py-3 sm:px-2">
              <section className="surface-card overflow-hidden rounded-[32px] border border-white/8">
                <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:px-8 lg:py-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[#9ED7A8]/64">History workspace</p>
                    <h3 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                      Search past footage without drowning in one long results page
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-[15px]">
                      This view now gives you a clearer search workspace, stronger result summaries, and matched-frame browsing in batches of five so it is easier to review.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-[24px] border border-[#9ED7A8]/12 bg-[linear-gradient(135deg,rgba(159,214,138,0.22),rgba(10,22,14,0.35))] px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">Stored videos</p>
                      <p className="mt-2 text-3xl font-semibold text-[#F1FFE9]">{history.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-white/4 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">Saved queries</p>
                      <p className="mt-2 text-3xl font-semibold text-[#F1FFE9]">{previousQueries.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-white/4 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">Sampled frames</p>
                      <p className="mt-2 text-3xl font-semibold text-[#F1FFE9]">{totalSampledFrames}</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
                <section className="surface-card rounded-[30px] border border-white/8 p-5 sm:p-6">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#9ED7A8]/64">Search</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">Find the right moment faster</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                        Describe the scene in plain language. Results are separated into matched segments and matched frames so the page stays easier to scan.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
                      Latest run: <span className="font-semibold text-[#DFFFE2]">{hasSearched ? searchRunId : 0}</span>
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
                    <div className="flex flex-wrap gap-3">
                      <button className="app-button app-button-primary text-sm">
                        {isSearching ? "Searching..." : "Search videos"}
                      </button>
                      <button
                        type="button"
                        onClick={loadHistory}
                        className="app-button app-button-secondary text-sm"
                      >
                        Refresh history
                      </button>
                    </div>
                  </form>

                  {isSearching && (
                    <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75">
                      Running semantic search and refreshing results...
                    </div>
                  )}

                  {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Frame matches</p>
                      <p className="mt-2 text-2xl font-semibold text-[#F1FFE9]">{frameResults.length}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Segment matches</p>
                      <p className="mt-2 text-2xl font-semibold text-[#F1FFE9]">{dedupedGroupedResults.length}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Result pages</p>
                      <p className="mt-2 text-2xl font-semibold text-[#F1FFE9]">
                        {Math.max(
                          frameResults.length > 0 ? totalFramePages : 0,
                          dedupedGroupedResults.length > 0 ? totalSegmentPages : 0,
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                {previousQueries.length > 0 && (
                  <aside className="surface-card rounded-[30px] border border-white/8 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#9ED7A8]/64">Query history</p>
                        <h4 className="mt-2 text-xl font-semibold text-white">Recent searches</h4>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">Last {previousQueries.length} searches</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {previousQueries.map((entry) => (
                        <div key={entry.id} className="panel-card rounded-[22px] border border-white/8 p-4">
                          <div>
                            <p className="text-sm font-semibold text-[#E8F6E7]">{entry.query}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">
                              {formatHistoryDate(entry.createdAt)}
                            </p>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleUsePreviousQuery(entry.query)}
                              className="app-button app-button-secondary text-sm"
                            >
                              Use this query
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuery(entry.id)}
                              className="rounded-2xl bg-red-300/10 px-4 py-2 text-sm font-semibold text-red-100"
                            >
                              Delete query
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                )}
              </div>

              <SearchDebugPanel debug={searchDebug} />

              {hasSearched && !isSearching && !error && dedupedGroupedResults.length === 0 && frameResults.length === 0 && (
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-sm text-white/75">
                  No matching segments or frames were returned for this query.
                </div>
              )}

              {frameResults.length > 0 && (
                <section className="surface-card rounded-[30px] border border-[#9ED7A8]/10 p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#9ED7A8]/64">Matched frames</p>
                      <h4 className="mt-2 text-2xl font-semibold text-white">Top frame matches</h4>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                        Each card now focuses on the matched frame preview, match percentage, and source video name so the results are easier to understand at a glance.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[#9ED7A8]/14 bg-[linear-gradient(135deg,rgba(159,214,138,0.16),rgba(8,19,13,0.72))] px-5 py-4 text-sm text-white/78">
                      <p>
                        Showing <span className="font-semibold text-[#DFFFE2]">{visibleFrameRangeStart}</span>
                        {" "}-{" "}
                        <span className="font-semibold text-[#DFFFE2]">{visibleFrameRangeEnd}</span> of{" "}
                        <span className="font-semibold text-[#DFFFE2]">{frameResults.length}</span> matched frame results
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                        5 matches per page
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 rounded-[24px] border border-white/8 bg-[#08130D]/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3 text-sm text-white/72">
                      <span className="rounded-full bg-white/6 px-3 py-1.5">
                        Current page: <span className="font-semibold text-[#DFFFE2]">{currentFramePage}</span>
                      </span>
                      <span className="rounded-full bg-white/6 px-3 py-1.5">
                        Total pages: <span className="font-semibold text-[#DFFFE2]">{totalFramePages}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFrameResultsPage((page) => Math.max(1, page - 1))}
                        disabled={currentFramePage === 1}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Previous 5
                      </button>
                      <div className="rounded-2xl bg-[#102317] px-4 py-2 text-sm font-semibold text-[#DFFFE2]">
                        Page {currentFramePage} of {totalFramePages}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFrameResultsPage((page) => Math.min(totalFramePages, page + 1))}
                        disabled={currentFramePage === totalFramePages}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Next 5
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
                    {visibleFrameResults.map((item) => (
                      <SearchResultCard
                        key={`${searchRunId}-frame-${item.matchId || `${item.analysis.id}-${item.matchedFrame?.frameIndex}`}`}
                        item={item}
                        isLowConfidence={false}
                        resultType="frame"
                      />
                    ))}
                  </div>
                </section>
              )}

              {dedupedGroupedResults.length > 0 && (
                <section className="surface-card rounded-[30px] border border-white/8 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#9ED7A8]/64">Matched segments</p>
                      <h4 className="mt-2 text-2xl font-semibold text-white">Timeline-level matches</h4>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                      Showing <span className="font-semibold text-[#DFFFE2]">{visibleSegmentRangeStart}</span>
                      {" "}-{" "}
                      <span className="font-semibold text-[#DFFFE2]">{visibleSegmentRangeEnd}</span> of{" "}
                      <span className="font-semibold text-[#DFFFE2]">{dedupedGroupedResults.length}</span> matched segment results
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 rounded-[24px] border border-white/8 bg-[#08130D]/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3 text-sm text-white/72">
                      <span className="rounded-full bg-white/6 px-3 py-1.5">
                        Current page: <span className="font-semibold text-[#DFFFE2]">{currentSegmentPage}</span>
                      </span>
                      <span className="rounded-full bg-white/6 px-3 py-1.5">
                        Total pages: <span className="font-semibold text-[#DFFFE2]">{totalSegmentPages}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSegmentResultsPage((page) => Math.max(1, page - 1))}
                        disabled={currentSegmentPage === 1}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Previous 5
                      </button>
                      <div className="rounded-2xl bg-[#102317] px-4 py-2 text-sm font-semibold text-[#DFFFE2]">
                        Page {currentSegmentPage} of {totalSegmentPages}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSegmentResultsPage((page) => Math.min(totalSegmentPages, page + 1))}
                        disabled={currentSegmentPage === totalSegmentPages}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Next 5
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                    {visibleSegmentResults.map((item) => (
                      <SearchResultCard
                        key={`${searchRunId}-${item.matchId || `${item.analysis.id}-${item.matchedInterval?.startFrameIndex}`}`}
                        item={item}
                        isLowConfidence={false}
                        resultType="segment"
                      />
                    ))}
                  </div>
                </section>
              )}
            </section>

            <section className="mt-8 px-1 py-3 sm:px-2">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#9ED7A8]/64">Stored footage</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Video history</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                  Showing <span className="font-semibold text-[#DFFFE2]">{visibleHistoryRangeStart}</span>
                  {" "}-{" "}
                  <span className="font-semibold text-[#DFFFE2]">{visibleHistoryRangeEnd}</span> of{" "}
                  <span className="font-semibold text-[#DFFFE2]">{history.length}</span> videos
                </div>
              </div>

              {history.length === 0 ? (
                <div className="surface-card rounded-[28px] px-6 py-10 text-center">
                  <p className="text-white/85">
                    No history data available right now.
                    <br />
                    Upload a video after login to create user-scoped history.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-white/8 bg-[#08130D]/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3 text-sm text-white/72">
                      <span className="rounded-full bg-white/6 px-3 py-1.5">
                        Current page: <span className="font-semibold text-[#DFFFE2]">{currentHistoryPage}</span>
                      </span>
                      <span className="rounded-full bg-white/6 px-3 py-1.5">
                        Total pages: <span className="font-semibold text-[#DFFFE2]">{totalHistoryPages}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                        disabled={currentHistoryPage === 1}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Previous 5
                      </button>
                      <div className="rounded-2xl bg-[#102317] px-4 py-2 text-sm font-semibold text-[#DFFFE2]">
                        Page {currentHistoryPage} of {totalHistoryPages}
                      </div>
                      <button
                        type="button"
                        onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                        disabled={currentHistoryPage === totalHistoryPages}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Next 5
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                  {visibleHistory.map((item) => (
                    <HistoryVideoCard
                      key={item.id}
                      item={item}
                      onDelete={handleDeleteVideo}
                      isDeleting={deletingAnalysisId === item.id}
                    />
                  ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default History;
