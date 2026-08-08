import { Router } from "express";
import { uploadImage, uploadAudio, uploadPdf, uploadEpub, uploadHeroBannerImage, uploadAuthorImage } from "../controllers/uploadController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Ensure temp_uploads directory exists inside workspace
const uploadDir = "temp_uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskUpload = multer({
  dest: `${uploadDir}/`,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".mp3") {
      return cb(new Error("Only .mp3 files are allowed."), false);
    }
    cb(null, true);
  }
});

const pdfDiskUpload = multer({
  dest: `${uploadDir}/`,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      return cb(new Error("Only .pdf files are allowed."), false);
    }
    cb(null, true);
  }
});

const epubDiskUpload = multer({
  dest: `${uploadDir}/`,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".epub" && ext !== ".pdf") {
      return cb(new Error("Only .epub and .pdf files are allowed."), false);
    }
    cb(null, true);
  }
});

// POST /api/upload
router.post("/", uploadImage);

// POST /api/upload/hero-banner
router.post("/hero-banner", uploadHeroBannerImage);

// POST /api/upload/author
router.post("/author", uploadAuthorImage);

// POST /api/upload/audio
router.post("/audio", (req, res, next) => {
  diskUpload.single("audio")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadAudio);

// POST /api/upload/pdf
router.post("/pdf", (req, res, next) => {
  pdfDiskUpload.single("pdf")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadPdf);

// POST /api/upload/epub
router.post("/epub", (req, res, next) => {
  epubDiskUpload.single("epub")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, uploadEpub);

export default router;
