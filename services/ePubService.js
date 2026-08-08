import { EPub } from "../models/EPub.js";

const normalizeEPubRating = (epub) => {
  if (!epub) return epub;
  const data = epub.toObject ? epub.toObject() : epub;
  const reviewCount = Number(data.reviewCount || 0);
  return {
    ...data,
    id: data.id || (data._id ? String(data._id) : undefined),
    rating: reviewCount > 0 ? Number(data.rating || 0) : 0,
    reviewCount,
  };
};

/**
 * Fetch all e-pubs from the database matching the criteria.
 */
export const queryEPubs = async ({ category, search, limit, fields }) => {
  const queryCond = {};

  if (category) {
    queryCond.category = String(category);
  }

  if (search) {
    queryCond.$or = [
      { name: { $regex: String(search), $options: "i" } },
      { author: { $regex: String(search), $options: "i" } },
      { description: { $regex: String(search), $options: "i" } },
    ];
  }

  let q = EPub.find(queryCond).lean();
  if (fields) {
    const projection = fields.split(",").join(" ");
    q = q.select(projection);
  } else {
    q = q.select("-reviews");
  }
  
  q = q.sort({ updatedAt: -1 });
  if (limit) {
    q = q.limit(Number(limit));
  }

  const epubs = await q.exec();
  return epubs.map(normalizeEPubRating);
};

/**
 * Fetch a single e-pub by ID.
 */
export const fetchEPubById = async (id) => {
  const epub = await EPub.findById(id);
  return normalizeEPubRating(epub);
};

/**
 * Fetch reviews for an e-pub.
 */
export const fetchEPubReviews = async (id) => {
  const epub = await EPub.findById(id).select("reviews rating reviewCount");
  return epub ? epub.reviews : [];
};

/**
 * Add or update a review for an e-pub.
 */
export const addEPubReview = async (id, reviewData) => {
  const epub = await EPub.findById(id);
  if (!epub) return null;

  const normalizedRating = Math.min(5, Math.max(1, Number(reviewData.rating) || 5));
  const existingReview = (epub.reviews || []).find(
    (review) => String(review.userId) === String(reviewData.userId)
  );

  if (existingReview) {
    existingReview.rating = normalizedRating;
    existingReview.comment = reviewData.comment || existingReview.comment || "";
    existingReview.userName = reviewData.userName || existingReview.userName || "Customer";
    existingReview.createdAt = existingReview.createdAt || new Date();
  } else {
    epub.reviews.push({
      userId: reviewData.userId,
      userName: reviewData.userName || "Customer",
      rating: normalizedRating,
      comment: reviewData.comment || "",
      createdAt: new Date(),
    });
  }

  const reviewCount = (epub.reviews || []).length;
  const averageRating =
    reviewCount > 0
      ? Number(
          (
            (epub.reviews || []).reduce(
              (sum, review) => sum + Number(review.rating || 0),
              0
            ) / reviewCount
          ).toFixed(1)
        )
      : 0;

  epub.reviewCount = reviewCount;
  epub.rating = averageRating;

  await epub.save();
  return normalizeEPubRating(epub);
};

/**
 * Add a new e-pub to the catalog.
 */
export const addNewEPub = async (epubData) => {
  const newEPub = new EPub(epubData);
  return await newEPub.save();
};

/**
 * Modify an existing e-pub.
 */
export const modifyEPub = async (id, epubData) => {
  return await EPub.findByIdAndUpdate(id, epubData, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete an e-pub from the catalog.
 */
export const removeEPub = async (id) => {
  return await EPub.findByIdAndDelete(id);
};

/**
 * Delete multiple e-pubs from the catalog.
 */
export const removeMultipleEPubs = async (ids) => {
  return await EPub.deleteMany({ _id: { $in: ids } });
};
