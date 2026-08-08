import { Router } from "express";
import { uploadAudiobookCover, uploadAudiobookAudio } from "../controllers/audiobooksUploadController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const uploadDir = path.join(__dirname, "..", "temp_uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskUpload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".mp3") {
      return cb(new Error("Only .mp3 files are allowed."), false);
    }
    cb(null, true);
  }
});

// POST /api/upload/audiobooks/cover
router.post("/cover", uploadAudiobookCover);

// POST /api/upload/audiobooks/audio
router.post("/audio", (req, res, next) => {
  diskUpload.single("audio")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadAudiobookAudio);

export default router;
