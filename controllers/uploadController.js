import cloudinary from "../config/cloudinary.js";
import fs from "fs";

/**
 * Handles uploading an image (base64 string or remote URL) to Cloudinary in the 'Book' folder.
 */
export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Initiating Cloudinary upload to 'Book' folder...");
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "Book",
    });

    console.log("Cloudinary upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({
      error: "Failed to upload image to Cloudinary",
      details: error.message || error,
    });
  }
};

/**
 * Handles uploading an audio file (.mp3) to Cloudinary in the 'AudioBook' folder.
 */
export const uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    console.log("Initiating Cloudinary audio upload to 'AudioBook' folder...");
    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "AudioBook",
      resource_type: "video", // Required for audio files in Cloudinary
    });

    // Delete the local temp file after upload
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    console.log("Cloudinary audio upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      duration: uploadResponse.duration ? String(uploadResponse.duration) : "",
      size: uploadResponse.bytes || req.file.size || 0,
      name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
    });
  } catch (error) {
    console.error("Cloudinary audio upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temp file on error:", err);
      });
    }
    res.status(500).json({
      error: "Failed to upload audio to Cloudinary",
      details: error.message || error,
    });
  }
};

/**
 * Handles uploading a PDF file to Cloudinary in the 'BookPDFs' folder.
 */
export const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    console.log("Initiating Cloudinary PDF upload to 'BookPDFs' folder...");
    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "BookPDFs",
      resource_type: "raw", // Use raw to bypass strict PDF delivery restrictions
      public_id: req.file.originalname, // Ensures the file has the correct extension
    });

    // Delete the local temp file after upload
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    console.log("Cloudinary PDF upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      size: uploadResponse.bytes || req.file.size || 0,
      name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
    });
  } catch (error) {
    console.error("Cloudinary PDF upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temp file on error:", err);
      });
    }
    res.status(500).json({
      error: "Failed to upload PDF to Cloudinary",
      details: error.message || error,
    });
  }
};

/**
 * Handles uploading an EPUB file to Cloudinary in the 'EPubs' folder.
 */
export const uploadEpub = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No EPUB file provided" });
    }

    console.log("Initiating Cloudinary EPUB upload to 'EPubs' folder...");
    const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
      folder: "EPubs",
      resource_type: "raw", // Use raw to bypass strict delivery restrictions
      public_id: req.file.originalname, // Ensures the file has the correct extension
    });

    // Delete the local temp file after upload
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    console.log("Cloudinary EPUB upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      size: uploadResponse.bytes || req.file.size || 0,
      name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
    });
  } catch (error) {
    console.error("Cloudinary EPUB upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temp file on error:", err);
      });
    }
    res.status(500).json({
      error: "Failed to upload EPUB to Cloudinary",
      details: error.message || error,
    });
  }
};

/**
 * Handles uploading an image to Cloudinary in the 'HERO BANNER' folder.
 */
export const uploadHeroBannerImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Initiating Cloudinary upload to 'HERO BANNER' folder...");
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "HERO BANNER",
    });

    console.log("Cloudinary upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({
      error: "Failed to upload image to Cloudinary",
      details: error.message || error,
    });
  }
};

/**
 * Handles uploading an image to Cloudinary in the 'AuthorPhotos' folder.
 */
export const uploadAuthorImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Initiating Cloudinary upload to 'AuthorPhotos' folder...");
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "AuthorPhotos",
    });

    console.log("Cloudinary author upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Cloudinary author upload error:", error);
    res.status(500).json({
      error: "Failed to upload image to Cloudinary",
      details: error.message || error,
    });
  }
};