import cloudinary from "../config/cloudinary.js";

/**
 * Upload audiobook cover image (base64 string) to Cloudinary 'AudioBook' folder.
 * Dedicated to the Audiobooks bulk upload module only.
 */
export const uploadAudiobookCoverToCloudinary = async (image) => {
  return await cloudinary.uploader.upload(image, {
    folder: "AudioBook",
  });
};

/**
 * Upload audiobook audio track (.mp3 file path) to Cloudinary 'AudioBook' folder.
 * Dedicated to the Audiobooks bulk upload module only.
 */
export const uploadAudiobookAudioToCloudinary = async (filePath) => {
  return await cloudinary.uploader.upload(filePath, {
    folder: "AudioBook",
    resource_type: "video",
  });
};
