const { randomUUID } = require("crypto");
const Analysis = require("../models/analysisModel");
const { getTextEmbedding, getVideoEmbeddings } = require("../services/mlService");
const { searchPoints, upsertPoints } = require("../services/qdrantService");
const MERGE_GAP_SECONDS = 2;
const MIN_TOP_SCORE = Number(process.env.SEARCH_MIN_TOP_SCORE || 0.22);
const MIN_INTERVAL_SCORE = Number(process.env.SEARCH_MIN_INTERVAL_SCORE || 0.24);
const MIN_AVERAGE_INTERVAL_SCORE = Number(process.env.SEARCH_MIN_AVERAGE_INTERVAL_SCORE || 0.22);
const MIN_SINGLE_FRAME_SCORE = Number(process.env.SEARCH_MIN_SINGLE_FRAME_SCORE || 0.26);
const MIN_FALLBACK_TOP_SCORE = Number(process.env.SEARCH_MIN_FALLBACK_TOP_SCORE || 0.26);
const FALLBACK_SCORE_RATIO = Number(process.env.SEARCH_FALLBACK_SCORE_RATIO || 0.82);
const RELATIVE_SCORE_RATIO = Number(process.env.SEARCH_RELATIVE_SCORE_RATIO || 0.88);
const MAX_SCORE_DROP = Number(process.env.SEARCH_MAX_SCORE_DROP || 0.08);
const TEMPORAL_SMOOTHING_WINDOW = Number(process.env.SEARCH_TEMPORAL_SMOOTHING_WINDOW || 2);

function toHistoryItem(record) {
  return {
    id: record._id,
    originalFileName: record.originalFileName,
    notes: record.notes,
    fileSize: record.fileSize,
    frameCount: record.frameCount,
    embeddingDimension: record.embeddingDimension,
    qdrantPointId: record.qdrantPointId,
    status: record.status,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    videoStreamPath: `/api/video/file/${record._id}`,
  };
}

function toRawMatchDebug(match, recordMap) {
  const analysisId = match.payload?.analysisId;
  const record = analysisId ? recordMap.get(analysisId) : null;

  return {
    matchId: match.id,
    score: Number(match.score) || 0,
    analysisId: analysisId || null,
    pointType: match.payload?.pointType || "frame",
    frameIndex: match.payload?.frameIndex ?? 0,
    timestampSeconds: Number(match.payload?.timestampSeconds ?? 0),
    endTimestampSeconds: Number(
      match.payload?.endTimestampSeconds ?? match.payload?.timestampSeconds ?? 0,
    ),
    originalFileName: record?.originalFileName || match.payload?.originalFileName || "",
    notes: record?.notes || match.payload?.notes || "",
  };
}

function buildIntervals(matches, recordMap) {
  const groupedByAnalysis = new Map();

  matches.forEach((match) => {
    const analysisId = match.payload?.analysisId;
    if (!analysisId) {
      return;
    }

    const record = recordMap.get(analysisId);
    if (!record) {
      return;
    }

    const entry = {
      matchId: match.id,
      score: Number(match.score) || 0,
      frameIndex: match.payload?.centerFrameIndex ?? match.payload?.frameIndex ?? 0,
      timestampSeconds: Number(
        match.payload?.centerTimestampSeconds ?? match.payload?.timestampSeconds ?? 0,
      ),
      intervalStartSeconds: Number(
        match.payload?.startTimestampSeconds ?? match.payload?.timestampSeconds ?? 0,
      ),
      intervalEndSeconds: Number(
        match.payload?.endTimestampSeconds ?? match.payload?.timestampSeconds ?? 0,
      ),
      intervalStartFrameIndex: match.payload?.startFrameIndex ?? match.payload?.frameIndex ?? 0,
      intervalEndFrameIndex: match.payload?.endFrameIndex ?? match.payload?.frameIndex ?? 0,
      analysis: toHistoryItem(record),
    };

    if (!groupedByAnalysis.has(analysisId)) {
      groupedByAnalysis.set(analysisId, []);
    }

    groupedByAnalysis.get(analysisId).push(entry);
  });

  const intervals = [];

  groupedByAnalysis.forEach((entries) => {
    const sortedEntries = entries.sort((left, right) => left.timestampSeconds - right.timestampSeconds);
    const smoothedEntries = sortedEntries.map((entry, index) => {
      let weightedScoreSum = entry.score * 2;
      let totalWeight = 2;

      for (let offset = 1; offset <= TEMPORAL_SMOOTHING_WINDOW; offset += 1) {
        const previous = sortedEntries[index - offset];
        const next = sortedEntries[index + offset];

        if (
          previous &&
          entry.timestampSeconds - previous.timestampSeconds <= MERGE_GAP_SECONDS * TEMPORAL_SMOOTHING_WINDOW
        ) {
          weightedScoreSum += previous.score;
          totalWeight += 1;
        }

        if (
          next &&
          next.timestampSeconds - entry.timestampSeconds <= MERGE_GAP_SECONDS * TEMPORAL_SMOOTHING_WINDOW
        ) {
          weightedScoreSum += next.score;
          totalWeight += 1;
        }
      }

      return {
        ...entry,
        smoothedScore: weightedScoreSum / totalWeight,
      };
    });
    let current = null;

    smoothedEntries.forEach((entry) => {
      if (!current) {
        current = {
          matchId: entry.matchId,
          score: entry.smoothedScore,
          averageScore: entry.smoothedScore,
          scoreSum: entry.smoothedScore,
          matchedFrameScore: entry.score,
          analysis: entry.analysis,
          matchedInterval: {
            startSeconds: entry.intervalStartSeconds,
            endSeconds: entry.intervalEndSeconds,
            startFrameIndex: entry.intervalStartFrameIndex,
            endFrameIndex: entry.intervalEndFrameIndex,
            matchedFrameCount: 1,
          },
          matchedFrame: {
            frameIndex: entry.frameIndex,
            timestampSeconds: entry.timestampSeconds,
          },
        };
        return;
      }

      if (entry.timestampSeconds - current.matchedInterval.endSeconds <= MERGE_GAP_SECONDS) {
        current.score = Math.max(current.score, entry.smoothedScore);
        current.scoreSum += entry.smoothedScore;
        current.matchedInterval.startSeconds = Math.min(
          current.matchedInterval.startSeconds,
          entry.intervalStartSeconds,
        );
        current.matchedInterval.endSeconds = Math.max(
          current.matchedInterval.endSeconds,
          entry.intervalEndSeconds,
        );
        current.matchedInterval.startFrameIndex = Math.min(
          current.matchedInterval.startFrameIndex,
          entry.intervalStartFrameIndex,
        );
        current.matchedInterval.endFrameIndex = Math.max(
          current.matchedInterval.endFrameIndex,
          entry.intervalEndFrameIndex,
        );
        current.matchedInterval.matchedFrameCount += 1;
        current.averageScore = current.scoreSum / current.matchedInterval.matchedFrameCount;

        if (entry.score > current.matchedFrameScore) {
          current.matchedFrameScore = entry.score;
          current.matchedFrame = {
            frameIndex: entry.frameIndex,
            timestampSeconds: entry.timestampSeconds,
          };
        }
        return;
      }

      intervals.push(current);
      current = {
        matchId: entry.matchId,
        score: entry.smoothedScore,
        averageScore: entry.smoothedScore,
        scoreSum: entry.smoothedScore,
        matchedFrameScore: entry.score,
        analysis: entry.analysis,
        matchedInterval: {
          startSeconds: entry.intervalStartSeconds,
          endSeconds: entry.intervalEndSeconds,
          startFrameIndex: entry.intervalStartFrameIndex,
          endFrameIndex: entry.intervalEndFrameIndex,
          matchedFrameCount: 1,
        },
        matchedFrame: {
          frameIndex: entry.frameIndex,
          timestampSeconds: entry.timestampSeconds,
        },
      };
    });

    if (current) {
      intervals.push(current);
    }
  });

  return intervals;
}

function mergeAdjacentIntervals(intervals) {
  if (intervals.length <= 1) {
    return intervals;
  }

  const sorted = [...intervals].sort((left, right) => {
    const analysisCompare = String(left.analysis.id).localeCompare(String(right.analysis.id));
    if (analysisCompare !== 0) {
      return analysisCompare;
    }

    return left.matchedInterval.startSeconds - right.matchedInterval.startSeconds;
  });

  const merged = [];

  sorted.forEach((item) => {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.analysis.id === item.analysis.id &&
      item.matchedInterval.startSeconds - previous.matchedInterval.endSeconds <= MERGE_GAP_SECONDS
    ) {
      previous.score = Math.max(previous.score, item.score);
      previous.averageScore = Math.max(previous.averageScore, item.averageScore);
      previous.matchedInterval.endSeconds = item.matchedInterval.endSeconds;
      previous.matchedInterval.endFrameIndex = item.matchedInterval.endFrameIndex;
      previous.matchedInterval.matchedFrameCount += item.matchedInterval.matchedFrameCount;

      if ((item.matchedFrameScore || 0) > (previous.matchedFrameScore || 0)) {
        previous.matchedFrameScore = item.matchedFrameScore;
        previous.matchedFrame = { ...item.matchedFrame };
      }
      return;
    }

    merged.push({
      ...item,
      matchedInterval: { ...item.matchedInterval },
      matchedFrame: item.matchedFrame ? { ...item.matchedFrame } : null,
    });
  });

  return merged;
}

function filterIntervals(intervals, limit) {
  if (!intervals.length) return [];

  return mergeAdjacentIntervals(intervals)
    .filter((item) => {
      const frameCount = item.matchedInterval.matchedFrameCount;

      if (frameCount === 1) {
        return item.score >= MIN_SINGLE_FRAME_SCORE;
      }

      return (
        frameCount >= 2 &&
        item.score >= MIN_INTERVAL_SCORE &&
        item.averageScore >= MIN_AVERAGE_INTERVAL_SCORE
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ scoreSum, matchedFrameScore, ...item }) => item);
}

function fallbackIntervals(intervals, limit, topScore) {
  if (!intervals.length || topScore < MIN_FALLBACK_TOP_SCORE) {
    return [];
  }

  const fallbackScore = Math.max(MIN_TOP_SCORE, topScore * FALLBACK_SCORE_RATIO);

  return mergeAdjacentIntervals(intervals)
    .filter((item) => item.score >= fallbackScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ scoreSum, matchedFrameScore, ...item }) => item);
}

function filterRelativeMatches(matches) {
  if (!matches.length) {
    return {
      filteredMatches: [],
      topScore: 0,
      relativeFloor: 0,
    };
  }

  const topScore = Number(matches[0]?.score) || 0;
  const relativeFloor = Math.max(
    MIN_TOP_SCORE,
    topScore * RELATIVE_SCORE_RATIO,
    topScore - MAX_SCORE_DROP,
  );

  return {
    filteredMatches: matches.filter((item) => (Number(item.score) || 0) >= relativeFloor),
    topScore,
    relativeFloor,
  };
}

async function buildSearchCandidateSet(vector, userId, limit) {
  const windowMatches = await searchPoints(vector, userId, limit, "window");
  const filteredWindow = filterRelativeMatches(windowMatches);

  if (filteredWindow.filteredMatches.length > 0) {
    return {
      matches: windowMatches,
      filteredMatches: filteredWindow.filteredMatches,
      topScore: filteredWindow.topScore,
      relativeFloor: filteredWindow.relativeFloor,
      searchedPointType: "window",
    };
  }

  const frameMatches = await searchPoints(vector, userId, limit, "frame");
  const filteredFrame = filterRelativeMatches(frameMatches);

  return {
    matches: frameMatches,
    filteredMatches: filteredFrame.filteredMatches,
    topScore: filteredFrame.topScore,
    relativeFloor: filteredFrame.relativeFloor,
    searchedPointType: "frame",
  };
}

const videoController = {
  ingestVideo: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    const analysis = await Analysis.create({
      user: req.user.userId,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      sharedVideoPath: req.file.path,
      notes: req.body.notes?.trim() || "",
      fileSize: req.file.size,
      status: "processing",
    });

    try {
      const fps = Number(req.body.fps || 2);
      const mlResult = await getVideoEmbeddings(req.file.path, fps);
      const embeddings = mlResult.embeddings || [];
      const frameSamples = mlResult.frame_samples || [];
      const windowEmbeddings = mlResult.window_embeddings || [];
      const windowSamples = mlResult.window_samples || [];

      if (embeddings.length === 0) {
        throw new Error("No embeddings generated for the uploaded video");
      }

      const analysisId = analysis._id.toString();
      const framePoints = embeddings.map((vector, index) => {
        const sample = frameSamples[index] || {};
        return {
          id: randomUUID(),
          vector,
          payload: {
            analysisId,
            userId: req.user.userId,
            pointType: "frame",
            originalFileName: req.file.originalname,
            notes: analysis.notes,
            createdAt: analysis.createdAt.toISOString(),
            frameIndex: sample.frame_index ?? index,
            timestampSeconds: sample.timestamp_seconds ?? index / Math.max(fps, 1),
          },
        };
      });

      const windowPoints = windowEmbeddings.map((vector, index) => {
        const sample = windowSamples[index] || {};
        return {
          id: randomUUID(),
          vector,
          payload: {
            analysisId,
            userId: req.user.userId,
            pointType: "window",
            originalFileName: req.file.originalname,
            notes: analysis.notes,
            createdAt: analysis.createdAt.toISOString(),
            startFrameIndex: sample.start_frame_index ?? 0,
            endFrameIndex: sample.end_frame_index ?? 0,
            centerFrameIndex: sample.center_frame_index ?? sample.start_frame_index ?? 0,
            startTimestampSeconds: sample.start_timestamp_seconds ?? 0,
            endTimestampSeconds: sample.end_timestamp_seconds ?? 0,
            centerTimestampSeconds:
              sample.center_timestamp_seconds ?? sample.start_timestamp_seconds ?? 0,
          },
        };
      });

      const points = [...framePoints, ...windowPoints];
      await upsertPoints(points);

      analysis.frameCount = mlResult.frame_count || embeddings.length;
      analysis.embeddingDimension = embeddings[0]?.length || 0;
      analysis.qdrantPointId = points[0]?.id || "";
      analysis.status = "completed";
      analysis.errorMessage = "";
      await analysis.save();

      return res.status(201).json({
        success: true,
        message: "Video analyzed successfully",
        analysis: toHistoryItem(analysis),
      });
    } catch (error) {
      console.error("Video ingest failed:", error);
      analysis.status = "failed";
      analysis.errorMessage = error.message;
      await analysis.save();

      return res.status(502).json({
        success: false,
        message: error.message || "Video analysis failed",
      });
    }
  },

  getHistory: async (req, res) => {
    const history = await Analysis.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      history: history.map(toHistoryItem),
    });
  },

  getDashboard: async (req, res) => {
    const [totalAnalyses, completedAnalyses, failedAnalyses, recentRecords] = await Promise.all([
      Analysis.countDocuments({ user: req.user.userId }),
      Analysis.countDocuments({ user: req.user.userId, status: "completed" }),
      Analysis.countDocuments({ user: req.user.userId, status: "failed" }),
      Analysis.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
      },
      recentAnalyses: recentRecords.map(toHistoryItem),
    });
  },

searchHistory: async (req, res) => {
  try {
    const query = req.body.query?.trim();
    const limit = Number(req.body.limit || 5);
    const searchLimit = 50;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const vector = await getTextEmbedding(query);

    if (!vector.length) {
      return res.status(400).json({
        success: false,
        message: "Failed to generate query embedding",
      });
    }

    const {
      matches,
      filteredMatches,
      topScore,
      relativeFloor,
      searchedPointType,
    } = await buildSearchCandidateSet(vector, req.user.userId, searchLimit);

    const analysisIds = filteredMatches
      .map((item) => item.payload?.analysisId)
      .filter(Boolean);

    const records = await Analysis.find({
      _id: { $in: analysisIds },
      user: req.user.userId,
    }).lean();

    const recordMap = new Map(
      records.map((record) => [record._id.toString(), record])
    );

    const intervals = buildIntervals(filteredMatches, recordMap);

    if (topScore < MIN_TOP_SCORE) {
      return res.status(200).json({
        success: true,
        results: [],
        debug: {
          message: "Top similarity score too low",
          topScore,
          minTopScore: MIN_TOP_SCORE,
          relativeFloor,
        },
      });
    }

    let results = filterIntervals(intervals, limit);
    let fallbackApplied = false;

    if (results.length === 0 && intervals.length > 0) {
      results = fallbackIntervals(intervals, limit, topScore);
      fallbackApplied = results.length > 0;
    }

    const rawTopMatches = filteredMatches
      .slice(0, 10)
      .map((match) => toRawMatchDebug(match, recordMap));
    return res.status(200).json({
      success: true,
      results,
      debug: {
        rawMatchCount: matches.length,
        filteredMatchCount: filteredMatches.length,
        intervalCount: intervals.length,
        returnedCount: results.length,
        topRawScores: filteredMatches.slice(0, 5).map((item) => Number(item.score) || 0),
        topRawMatches: rawTopMatches,
        searchedPointType,
        topScore,
        minTopScore: MIN_TOP_SCORE,
        minIntervalScore: MIN_INTERVAL_SCORE,
        minAverageIntervalScore: MIN_AVERAGE_INTERVAL_SCORE,
        minSingleFrameScore: MIN_SINGLE_FRAME_SCORE,
        minFallbackTopScore: MIN_FALLBACK_TOP_SCORE,
        relativeScoreRatio: RELATIVE_SCORE_RATIO,
        maxScoreDrop: MAX_SCORE_DROP,
        relativeFloor,
        fallbackApplied,
      },
    });
  } catch (error) {
    console.error("Search failed:", error);

    return res.status(502).json({
      success: false,
      message: error.message || "Search failed",
    });
  }
},

  streamVideo: async (req, res) => {
    const record = await Analysis.findOne({
      _id: req.params.analysisId,
      user: req.user.userId,
    }).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    return res.sendFile(record.sharedVideoPath);
  },
};

module.exports = videoController;
