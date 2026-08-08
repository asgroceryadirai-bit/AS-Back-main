import { uploadBookCoverToCloudinary } from "../services/booksUploadService.js";

/**
 * Handles uploading a book cover image (base64) to Cloudinary.
 * Dedicated to the Books upload module only.
 */
export const uploadBookCover = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }
    console.log("booksUploadController: uploading cover to Cloudinary 'Book' folder...");
    const uploadResponse = await uploadBookCoverToCloudinary(image);
    console.log("Book cover upload successful:", uploadResponse.secure_url);
    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error) {
    console.error("Book cover upload error:", error);
    res.status(500).json({
      error: "Failed to upload book cover image to Cloudinary",
      details: error.message || error,
    });
  }
};
