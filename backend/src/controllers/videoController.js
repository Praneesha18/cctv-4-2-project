const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const Analysis = require("../models/analysisModel");
const {
  getFramePreview,
  getTextEmbedding,
  getVideoEmbeddings,
} = require("../services/mlService");
const { deletePointsByAnalysisId, searchPoints, upsertPoints } = require("../services/qdrantService");

const SEARCH_DEFAULT_LIMIT = Math.max(1, Number(process.env.SEARCH_DEFAULT_LIMIT || 10));

function toHistoryItem(record) {
  return {
    id: record._id,
    originalFileName: record.originalFileName,
    notes: record.notes,
    fileSize: record.fileSize,
    fps: record.fps,
    frameCount: record.frameCount,
    frameSamples: record.frameSamples || [],
    embeddingDimension: record.embeddingDimension,
    qdrantPointId: record.qdrantPointId,
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
      fps: Number(req.body.fps || 2),
      status: "processing",
    });

    try {
      const fps = Number(req.body.fps || 2);
      const mlResult = await getVideoEmbeddings(req.file.path, fps);
      const embeddings = mlResult.embeddings || [];
      const frameSamples = mlResult.frame_samples || [];

      if (embeddings.length === 0) {
        throw new Error("No embeddings generated for the uploaded video");
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
            originalFileName: req.file.originalname,
            notes: analysis.notes,
            createdAt: analysis.createdAt.toISOString(),
            frameIndex: sample.frame_index ?? index,
            timestampSeconds: sample.timestamp_seconds ?? index / Math.max(fps, 1),
          },
        };
      });

      await upsertPoints(points);

      analysis.frameCount = mlResult.frame_count || embeddings.length;
      analysis.frameSamples = frameSamples.map((sample, index) => ({
        frameIndex: sample.frame_index ?? index,
        timestampSeconds: sample.timestamp_seconds ?? index / Math.max(fps, 1),
      }));
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
      const limit = Math.max(1, Number(req.body.limit || SEARCH_DEFAULT_LIMIT));

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

      const matches = await searchPoints(vector, req.user.userId, limit, "frame");
      const analysisIds = [...new Set(matches.map((item) => item.payload?.analysisId).filter(Boolean))];
      const records = await Analysis.find({
        _id: { $in: analysisIds },
        user: req.user.userId,
      }).lean();
      const recordMap = new Map(records.map((record) => [record._id.toString(), record]));

      const results = matches
        .map((match) => {
          const analysisId = match.payload?.analysisId;
          const record = analysisId ? recordMap.get(analysisId) : null;
          if (!record) {
            return null;
          }
          return toSearchResult(match, record);
        })
        .filter(Boolean);

      return res.status(200).json({
        success: true,
        results,
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
