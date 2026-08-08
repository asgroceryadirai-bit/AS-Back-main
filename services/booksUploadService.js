import cloudinary from "../config/cloudinary.js";

/**
 * Upload book cover image (base64 string) to Cloudinary 'Book' folder.
 * Dedicated to the Books bulk upload module only.
 */
export const uploadBookCoverToCloudinary = async (image) => {
  return await cloudinary.uploader.upload(image, {
    folder: "Book",
  });
};
