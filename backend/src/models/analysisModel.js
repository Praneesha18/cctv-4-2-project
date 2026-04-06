const mongoose = require("mongoose");

const frameSampleSchema = new mongoose.Schema(
  {
    frameIndex: {
      type: Number,
      default: 0,
    },
    timestampSeconds: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storedFileName: {
      type: String,
      required: true,
      trim: true,
    },
    sharedVideoPath: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fps: {
      type: Number,
      default: 2,
    },
    frameCount: {
      type: Number,
      default: 0,
    },
    frameSamples: {
      type: [frameSampleSchema],
      default: [],
    },
    embeddingDimension: {
      type: Number,
      default: 0,
    },
    qdrantPointId: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);
