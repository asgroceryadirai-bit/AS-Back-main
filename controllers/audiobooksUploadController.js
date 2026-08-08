import {
  uploadAudiobookCoverToCloudinary,
  uploadAudiobookAudioToCloudinary,
} from "../services/audiobooksUploadService.js";
import fs from "fs";

/**
 * Handles uploading an audiobook cover image (base64) to Cloudinary.
 * Dedicated to the Audiobooks upload module only.
 */
export const uploadAudiobookCover = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }
    console.log("audiobooksUploadController: uploading cover to Cloudinary 'AudioBook' folder...");
    const uploadResponse = await uploadAudiobookCoverToCloudinary(image);
    console.log("Audiobook cover upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Audiobook cover upload error:", error);
    res.status(500).json({
      error: "Failed to upload audiobook cover image to Cloudinary",
      details: error.message || error,
    });
  }
};

/**
 * Handles uploading an audiobook audio file (.mp3) to Cloudinary.
 * Dedicated to the Audiobooks upload module only.
 */
export const uploadAudiobookAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }
    console.log("audiobooksUploadController: uploading audio to Cloudinary 'AudioBook' folder...");
    const uploadResponse = await uploadAudiobookAudioToCloudinary(req.file.path);

    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    console.log("Audiobook audio upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      duration: uploadResponse.duration ? String(uploadResponse.duration) : "",
      size: uploadResponse.bytes || req.file.size || 0,
      name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
    });
  } catch (error) {
    console.error("Audiobook audio upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temp file on error:", err);
      });
    }
    res.status(500).json({
      error: "Failed to upload audiobook audio to Cloudinary",
      details: error.message || error,
    });
  }
};
