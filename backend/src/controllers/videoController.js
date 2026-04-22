const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const Analysis = require("../models/analysisModel");
const {
  getFramePreview,
  getTextEmbedding,
  getVideoEmbeddings,
} = require("../services/mlService");
const { deletePointsByAnalysisId, searchPoints, upsertPoints } = require("../services/qdrantService");

const SEARCH_DEFAULT_LIMIT = Math.max(1, Number(process.env.SEARCH_DEFAULT_LIMIT || 50));
const DEFAULT_INGEST_FPS = Number(process.env.DEFAULT_INGEST_FPS || 2);
const SEARCH_RAW_LIMIT = Math.max(5, Number(process.env.SEARCH_RAW_LIMIT || 20));
const SEARCH_LOGIT_SCALE = 100;
const SEARCH_MODALITY_THRESHOLDS = {
  action: {
    ignoreBelow: 0.03,
    rejectBelowTop1: 0.08,
    acceptTop1: 0.10,
    minGap: 0.01,
    minRatio: 1.10,
  },
  object: {
    ignoreBelow: 0.02,
    rejectBelowTop1: 0.15,
    acceptTop1: 0.15,
    minGap: 0.03,
    minRatio: 1.30,
  },
};
const ACTION_QUERY_TERMS = new Set([
  "action",
  "activity",
  "behavior",
  "behaviour",
  "movement",
  "moving",
  "motion",
  "running",
  "walking",
  "jumping",
  "fighting",
  "hitting",
  "pushing",
  "pulling",
  "stealing",
  "theft",
  "falling",
  "entering",
  "leaving",
  "sitting",
  "standing",
  "dancing",
]);
const QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "being",
  "been",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "and",
  "or",
  "from",
  "near",
  "around",
  "inside",
  "outside",
  "into",
  "out",
  "up",
  "down",
  "over",
  "under",
  "through",
]);

function toHistoryItem(record) {
  const displayFileName = record.displayFileName || record.originalFileName;
  return {
    id: record._id,
    originalFileName: displayFileName,
    displayFileName,
    notes: record.notes,
    fileSize: record.fileSize,
    fps: record.fps,
    frameCount: record.frameCount,
    frameSamples: record.frameSamples || [],
    embeddingDimension: record.embeddingDimension,
    summaryEmbeddingDimension: record.summaryEmbeddingDimension,
    actionEmbeddingDimension: record.actionEmbeddingDimension,
    qdrantPointId: record.qdrantPointId,
    summaryQdrantPointId: record.summaryQdrantPointId,
    actionQdrantPointId: record.actionQdrantPointId,
    status: record.status,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    videoStreamPath: `/api/video/file/${record._id}`,
    framePreviewBasePath: `/api/video/${record._id}/frame-preview`,
  };
}

function toSearchResult(match, record) {
  const payload = match.payload || {};
  const timestampSeconds = Number(payload.timestampSeconds ?? 0);
  const frameIndex = payload.frameIndex ?? 0;

  return {
    matchId: match.id,
    score: Number(match.score) || 0,
    analysis: toHistoryItem(record),
    matchedFrame: {
      frameIndex,
      timestampSeconds,
      previewPath: `/api/video/${record._id}/frame-preview?timestampSeconds=${encodeURIComponent(timestampSeconds)}`,
    },
    matchedInterval: {
      startSeconds: timestampSeconds,
      endSeconds: timestampSeconds,
      startFrameIndex: frameIndex,
      endFrameIndex: frameIndex,
    },
  };
}

function buildFrameResult(match, record) {
  return {
    ...toSearchResult(match, record),
    source: "frame",
  };
}

function buildWindowResult(match, record) {
  const payload = match.payload || {};
  const startSeconds = Number(payload.startTimestampSeconds ?? 0);
  const endSeconds = Number(payload.endTimestampSeconds ?? startSeconds);
  const representativeTimestampSeconds = Number(
    payload.representativeTimestampSeconds ?? startSeconds,
  );
  const representativeFrameIndex = Number(
    payload.representativeFrameIndex ?? payload.startFrameIndex ?? 0,
  );

  return {
    matchId: match.id,
    score: Number(match.score) || 0,
    analysis: toHistoryItem(record),
    source: "window",
    matchedFrame: {
      frameIndex: representativeFrameIndex,
      timestampSeconds: representativeTimestampSeconds,
      previewPath: `/api/video/${record._id}/frame-preview?timestampSeconds=${encodeURIComponent(representativeTimestampSeconds)}`,
    },
    matchedInterval: {
      startSeconds,
      endSeconds,
      startFrameIndex: Number(payload.startFrameIndex ?? representativeFrameIndex),
      endFrameIndex: Number(payload.endFrameIndex ?? representativeFrameIndex),
    },
  };
}

function attachConfidenceMargins(results) {
  return results.map((item, index) => ({
    ...item,
    confidenceMargin: Number(item.score || 0) - Number(results[index + 1]?.score || 0),
  }));
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeSoftmaxProbabilities(scores, scale = SEARCH_LOGIT_SCALE) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return [];
  }

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const scaled = scores.map((score) => (Number(score) || 0) * safeScale);
  const maxScaled = Math.max(...scaled);
  const exps = scaled.map((value) => Math.exp(value - maxScaled));
  const sumExps = exps.reduce((sum, value) => sum + value, 0);

  if (!sumExps || !Number.isFinite(sumExps)) {
    return scores.map(() => 0);
  }

  return exps.map((value) => value / sumExps);
}

function addSoftmaxProbabilities(results) {
  const scores = results.map((item) => Number(item.score) || 0);
  const probabilities = computeSoftmaxProbabilities(scores, SEARCH_LOGIT_SCALE);

  return results.map((item, index) => ({
    ...item,
    probability: probabilities[index] || 0,
    probabilityRank: index + 1,
  }));
}

function classifyQueryPipeline(query) {
  const tokens = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

  const actionTokens = tokens.filter((token) => ACTION_QUERY_TERMS.has(token));
  const objectTokens = tokens.filter(
    (token) => !ACTION_QUERY_TERMS.has(token) && !QUERY_STOPWORDS.has(token),
  );

  const hasActionTerms = actionTokens.length > 0;
  const hasObjectTerms = objectTokens.length > 0;

  if (hasActionTerms && !hasObjectTerms) {
    return {
      mode: "action_only",
      hasActionTerms,
      hasObjectTerms,
      actionTokens,
      objectTokens,
    };
  }

  if (hasActionTerms && hasObjectTerms) {
    return {
      mode: "mixed",
      hasActionTerms,
      hasObjectTerms,
      actionTokens,
      objectTokens,
    };
  }

  return {
    mode: "object_only",
    hasActionTerms,
    hasObjectTerms,
    actionTokens,
    objectTokens,
  };
}

function evaluateModalityThresholds(results, modality) {
  const thresholds = SEARCH_MODALITY_THRESHOLDS[modality] || SEARCH_MODALITY_THRESHOLDS.object;
  const topProbability = Number(results[0]?.probability || 0);
  const secondProbability = Number(results[1]?.probability || 0);
  const probabilityGap = topProbability - secondProbability;
  const topSecondRatio = secondProbability > 0 ? topProbability / secondProbability : topProbability > 0 ? Infinity : 0;

  if (!results.length || topProbability < thresholds.ignoreBelow) {
    return {
      shouldAccept: false,
      decision: "ignore",
      reason: "Top match probability is below the ignore threshold",
      topProbability,
      secondProbability,
      probabilityGap,
      topSecondRatio,
      thresholds,
    };
  }

  if (topProbability < thresholds.rejectBelowTop1) {
    return {
      shouldAccept: false,
      decision: "reject",
      reason: "Top match probability is below the minimum acceptance band",
      topProbability,
      secondProbability,
      probabilityGap,
      topSecondRatio,
      thresholds,
    };
  }

  if (
    topProbability >= thresholds.acceptTop1
    && probabilityGap >= thresholds.minGap
    && topSecondRatio >= thresholds.minRatio
  ) {
    return {
      shouldAccept: true,
      decision: "accept",
      reason: "Top match cleared the configured probability, gap, and ratio thresholds",
      topProbability,
      secondProbability,
      probabilityGap,
      topSecondRatio,
      thresholds,
    };
  }

  return {
    shouldAccept: false,
    decision: "reject",
    reason: "Top match did not clear the configured probability, gap, and ratio thresholds",
    topProbability,
    secondProbability,
    probabilityGap,
    topSecondRatio,
    thresholds,
  };
}

function filterAcceptedResults(results, decision) {
  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  if (!decision?.shouldAccept) {
    return [];
  }

  return results;
}

function uniqueAnalysisIds(matches) {
  return [
    ...new Set(matches.map((item) => item.payload?.analysisId).filter(Boolean)),
  ];
}

function summarizeRawMatches(matchesToSummarize) {
  return matchesToSummarize.map((match) => ({
    id: match.id,
    score: Number(match.score) || 0,
    analysisId: match.payload?.analysisId || null,
    pointType: match.payload?.pointType || null,
    frameIndex: match.payload?.frameIndex ?? null,
    timestampSeconds: Number(match.payload?.timestampSeconds ?? 0),
    startFrameIndex: match.payload?.startFrameIndex ?? null,
    endFrameIndex: match.payload?.endFrameIndex ?? null,
    startTimestampSeconds: Number(match.payload?.startTimestampSeconds ?? 0),
    endTimestampSeconds: Number(match.payload?.endTimestampSeconds ?? 0),
  }));
}

const videoController = {
  ingestVideo: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    if (!Number.isFinite(req.file.size) || req.file.size <= 0) {
      if (req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (error) {
          if (error?.code !== "ENOENT") {
            console.error("Failed to delete empty uploaded file:", error);
          }
        }
      }

      return res.status(400).json({
        success: false,
        message: "Uploaded video file is empty. Please re-upload a valid video.",
      });
    }

    const requestedDisplayName = String(req.body.displayFileName || "").trim();
    const displayFileName = requestedDisplayName || req.file.originalname;

    const analysis = await Analysis.create({
      user: req.user.userId,
      originalFileName: req.file.originalname,
      displayFileName,
      storedFileName: req.file.filename,
      sharedVideoPath: req.file.path,
      notes: req.body.notes?.trim() || "",
      fileSize: req.file.size,
      fps: DEFAULT_INGEST_FPS,
      status: "processing",
    });

    try {
      const fps = DEFAULT_INGEST_FPS;
      const mlResult = await getVideoEmbeddings(req.file.path, fps);
      const embeddings = mlResult.embeddings || [];
      const pooledEmbeddings = mlResult.pooled_embeddings || [];
      const summaryEmbedding = mlResult.action_embedding || [];
      const frameSamples = mlResult.frame_samples || [];
      const pooledSamples = mlResult.pooled_samples || [];

      if (embeddings.length === 0) {
        throw new Error("No embeddings generated for the uploaded video");
      }

      if (summaryEmbedding.length === 0) {
        throw new Error("No summary embedding generated for the uploaded video");
      }

      const analysisId = analysis._id.toString();
      const points = embeddings.map((vector, index) => {
        const sample = frameSamples[index] || {};
        return {
          id: randomUUID(),
          vector,
          payload: {
            analysisId,
            userId: req.user.userId,
            pointType: "frame",
            originalFileName: displayFileName,
            notes: analysis.notes,
            createdAt: analysis.createdAt.toISOString(),
            frameIndex: sample.frame_index ?? index,
            timestampSeconds: sample.timestamp_seconds ?? index / Math.max(fps, 1),
          },
        };
      });

      const pooledCount = Math.min(pooledEmbeddings.length, pooledSamples.length);
      for (let index = 0; index < pooledCount; index += 1) {
        const vector = pooledEmbeddings[index];
        const sample = pooledSamples[index] || {};
        points.push({
          id: randomUUID(),
          vector,
          payload: {
            analysisId,
            userId: req.user.userId,
            pointType: "window",
            originalFileName: displayFileName,
            notes: analysis.notes,
            createdAt: analysis.createdAt.toISOString(),
            windowIndex: index,
            startFrameIndex: sample.start_frame_index ?? 0,
            endFrameIndex: sample.end_frame_index ?? sample.start_frame_index ?? 0,
            startTimestampSeconds: sample.start_timestamp_seconds ?? 0,
            endTimestampSeconds:
              sample.end_timestamp_seconds ?? sample.start_timestamp_seconds ?? 0,
            representativeFrameIndex:
              sample.representative_frame_index ?? sample.start_frame_index ?? 0,
            representativeTimestampSeconds:
              sample.representative_timestamp_seconds
              ?? sample.start_timestamp_seconds
              ?? 0,
            windowFrameCount: sample.window_frame_count ?? 0,
          },
        });
      }

      const summaryPointId = randomUUID();
      points.push({
        id: summaryPointId,
        vector: summaryEmbedding,
        payload: {
          analysisId,
          userId: req.user.userId,
          pointType: "video",
          originalFileName: displayFileName,
          notes: analysis.notes,
          createdAt: analysis.createdAt.toISOString(),
          frameIndex: 0,
          timestampSeconds: 0,
          frameCount: frameSamples.length,
        },
      });

      await upsertPoints(points);

      analysis.frameCount = mlResult.frame_count || embeddings.length;
      analysis.frameSamples = frameSamples.map((sample, index) => ({
        frameIndex: sample.frame_index ?? index,
        timestampSeconds: sample.timestamp_seconds ?? index / Math.max(fps, 1),
        quality: sample.quality || {},
      }));
      analysis.embeddingDimension = embeddings[0]?.length || 0;
      analysis.qdrantPointId = points[0]?.id || "";
      analysis.summaryEmbeddingDimension = summaryEmbedding.length || 0;
      analysis.summaryQdrantPointId = summaryPointId;
      analysis.actionEmbeddingDimension = summaryEmbedding.length || 0;
      analysis.actionQdrantPointId = summaryPointId;
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

  getAnalysisFrames: async (req, res) => {
    const analysis = await Analysis.findOne({
      _id: req.params.analysisId,
      user: req.user.userId,
    }).lean();

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const frames = (analysis.frameSamples || []).map((sample) => ({
      frameIndex: sample.frameIndex,
      timestampSeconds: sample.timestampSeconds,
      quality: sample.quality || {},
      previewPath: `/api/video/${analysis._id}/frame-preview?timestampSeconds=${encodeURIComponent(sample.timestampSeconds)}`,
    }));

    return res.status(200).json({
      success: true,
      analysisId: analysis._id,
      frames,
    });
  },

  streamFramePreview: async (req, res) => {
    try {
      const analysis = await Analysis.findOne({
        _id: req.params.analysisId,
        user: req.user.userId,
      }).lean();

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      const timestampSeconds = Number(req.query.timestampSeconds || 0);
      const preview = await getFramePreview(analysis.sharedVideoPath, timestampSeconds);
      res.setHeader("Content-Type", preview.contentType);
      return res.send(preview.buffer);
    } catch (error) {
      console.error("Frame preview failed:", error);
      return res.status(502).json({
        success: false,
        message: error.message || "Frame preview failed",
      });
    }
  },

  deleteAnalysis: async (req, res) => {
    const analysis = await Analysis.findOne({
      _id: req.params.analysisId,
      user: req.user.userId,
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const analysisId = analysis._id.toString();
    const filePath = analysis.sharedVideoPath;

    await deletePointsByAnalysisId(analysisId, req.user.userId);
    await analysis.deleteOne();

    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          console.error("Failed to delete stored video file:", error);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      deletedAnalysisId: analysisId,
    });
  },

  searchHistory: async (req, res) => {
    try {
      const query = req.body.query?.trim();
      const includeRawMatches = req.body.includeRawMatches === true;
      const limit = SEARCH_DEFAULT_LIMIT;
      const coarseLimit = Math.max(limit, SEARCH_RAW_LIMIT);

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

      const pipeline = classifyQueryPipeline(query);
      const isObjectOnly = pipeline.mode === "object_only";
      const isActionOnly = pipeline.mode === "action_only";
      const isMixed = pipeline.mode === "mixed";

      let stage1PointType = isMixed ? "window" : isObjectOnly ? "frame" : "window";
      let candidateAnalysisIds = [];
      let frameMatches = [];
      let windowMatches = [];

      if (isObjectOnly) {
        frameMatches = await searchPoints(vector, req.user.userId, limit, "frame");
        candidateAnalysisIds = uniqueAnalysisIds(frameMatches);
        windowMatches = candidateAnalysisIds.length
          ? await searchPoints(vector, req.user.userId, limit, "window", {
              analysisIds: candidateAnalysisIds,
            })
          : [];
      } else if (isActionOnly) {
        windowMatches = await searchPoints(vector, req.user.userId, limit, "window");
        candidateAnalysisIds = uniqueAnalysisIds(windowMatches);
        frameMatches = candidateAnalysisIds.length
          ? await searchPoints(vector, req.user.userId, limit, "frame", {
              analysisIds: candidateAnalysisIds,
            })
          : [];
      } else {
        windowMatches = await searchPoints(vector, req.user.userId, coarseLimit, "window");
        candidateAnalysisIds = uniqueAnalysisIds(windowMatches);
        frameMatches = await searchPoints(vector, req.user.userId, limit, "frame", {
          analysisIds: candidateAnalysisIds,
        });
      }

      const matches = [...windowMatches, ...frameMatches];
      const analysisIds = uniqueAnalysisIds(matches);
      const records = await Analysis.find({
        _id: { $in: analysisIds },
        user: req.user.userId,
      }).lean();
      const recordMap = new Map(records.map((record) => [record._id.toString(), record]));
      const coarseResults = addSoftmaxProbabilities(
        attachConfidenceMargins(
          windowMatches
            .map((match) => {
              const analysisId = match.payload?.analysisId;
              const record = analysisId ? recordMap.get(analysisId) : null;
              if (!record) {
                return null;
              }

              return buildWindowResult(match, record);
            })
            .filter(Boolean)
            .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
            .slice(0, coarseLimit),
        ),
      );
      const frameResults = addSoftmaxProbabilities(
        attachConfidenceMargins(
          frameMatches
            .map((match) => {
              const analysisId = match.payload?.analysisId;
              const record = analysisId ? recordMap.get(analysisId) : null;
              if (!record) {
                return null;
              }

              return buildFrameResult(match, record);
            })
            .filter(Boolean)
            .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
            .slice(0, limit),
        ),
      );
      const segmentResults = addSoftmaxProbabilities(
        attachConfidenceMargins(
          windowMatches
            .map((match) => {
              const analysisId = match.payload?.analysisId;
              const record = analysisId ? recordMap.get(analysisId) : null;
              if (!record) {
                return null;
              }

              return buildWindowResult(match, record);
            })
            .filter(Boolean)
            .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
            .slice(0, limit),
        ),
      );

      const objectDecision = evaluateModalityThresholds(frameResults, "object");
      const actionDecision = evaluateModalityThresholds(segmentResults, "action");
      const returnedFrameResults = filterAcceptedResults(frameResults, objectDecision);
      const returnedSegmentResults = filterAcceptedResults(segmentResults, actionDecision);

      const coarseSoftmaxSorted = coarseResults
        .map((item) => Number(item.probability || 0))
        .sort((left, right) => right - left);
      const frameSoftmaxSorted = frameResults
        .map((item) => Number(item.probability || 0))
        .sort((left, right) => right - left);
      const segmentSoftmaxSorted = segmentResults
        .map((item) => Number(item.probability || 0))
        .sort((left, right) => right - left);
      const combinedScores = [...frameResults, ...segmentResults].map((item) => Number(item.score) || 0);
      const maxScore = combinedScores.length ? Math.max(...combinedScores) : 0;
      const minScore = combinedScores.length ? Math.min(...combinedScores) : 0;
      const absoluteScoreSpread = Math.abs(maxScore - minScore);

      const searchPath = isObjectOnly
        ? ["frame", "window"]
        : isActionOnly
          ? ["window", "frame"]
          : ["window", "frame"];

      console.info("[video-search] query classification", {
        query,
        mode: pipeline.mode,
        actionTokens: pipeline.actionTokens,
        objectTokens: pipeline.objectTokens,
        searchPath,
        candidateAnalysisIds,
      });

      return res.status(200).json({
        success: true,
        matchedFrames: returnedFrameResults,
        matchedSegments: returnedSegmentResults,
        results: returnedSegmentResults,
        debug: {
          route: "two_stage_multimodal_search",
          pipeline,
          query,
          queryType: pipeline.mode,
          searchPath,
          stage1: {
            pointType: stage1PointType,
            candidateCount: isObjectOnly ? frameMatches.length : windowMatches.length,
            candidateAnalysisIds,
          },
          stage2: {
            searchedPointTypes: isObjectOnly
              ? ["window"]
              : isActionOnly
                ? ["frame"]
                : ["frame"],
          },
          rawMatchCount: matches.length,
          coarseMatchCount: isObjectOnly ? frameMatches.length : windowMatches.length,
          frameMatchCount: frameMatches.length,
          windowMatchCount: windowMatches.length,
          returnedCount: returnedFrameResults.length + returnedSegmentResults.length,
          frameResultCount: returnedFrameResults.length,
          segmentResultCount: returnedSegmentResults.length,
          topK: limit,
          coarseTopK: coarseLimit,
          logitScale: SEARCH_LOGIT_SCALE,
          maxScore,
          minScore,
          absoluteScoreSpread,
          coarseSoftmaxSorted,
          frameSoftmaxSorted,
          segmentSoftmaxSorted,
          objectDecision,
          actionDecision,
          commonAnalysisCount: 0,
          ...(includeRawMatches
            ? {
                rawCoarseMatches: summarizeRawMatches(isObjectOnly ? frameMatches : windowMatches),
                rawFrameMatches: summarizeRawMatches(frameMatches),
                rawWindowMatches: summarizeRawMatches(windowMatches),
              }
            : {}),
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
