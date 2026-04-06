const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const videoController = require("../controllers/videoController");
const protect = require("../middleware/Protect");

const router = express.Router();
const uploadDir = process.env.SHARED_UPLOAD_DIR || path.join(process.cwd(), "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024,
  },
});

router.post("/ingest", protect, upload.single("video"), videoController.ingestVideo);
router.get("/history", protect, videoController.getHistory);
router.get("/dashboard", protect, videoController.getDashboard);
router.get("/:analysisId/frames", protect, videoController.getAnalysisFrames);
router.get("/:analysisId/frame-preview", protect, videoController.streamFramePreview);
router.post("/search", protect, videoController.searchHistory);
router.delete("/:analysisId", protect, videoController.deleteAnalysis);
router.get("/file/:analysisId", protect, videoController.streamVideo);

module.exports = router;
