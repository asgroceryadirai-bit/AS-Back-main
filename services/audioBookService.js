import { AudioBook } from "../models/AudioBook.js";

const normalizeAudioBookRating = (audioBook) => {
  if (!audioBook) return audioBook;
  const data = audioBook.toObject ? audioBook.toObject() : audioBook;
  const reviewCount = Number(data.reviewCount || 0);
  return {
    ...data,
    id: data.id || (data._id ? String(data._id) : undefined),
    rating: reviewCount > 0 ? Number(data.rating || 0) : 0,
    reviewCount,
  };
};

/**
 * Fetch all audio books from the database matching the criteria.
 */
export const queryAudioBooks = async ({ category, search, limit, fields }) => {
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

  let q = AudioBook.find(queryCond).lean();
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

  const audioBooks = await q.exec();
  return audioBooks.map(normalizeAudioBookRating);
};

/**
 * Fetch a single audio book by ID.
 */
export const fetchAudioBookById = async (id) => {
  const audioBook = await AudioBook.findById(id);
  return normalizeAudioBookRating(audioBook);
};

export const fetchAudioBookReviews = async (id) => {
  const audioBook = await AudioBook.findById(id).select("reviews rating reviewCount");
  return audioBook ? audioBook.reviews : [];
};

export const addAudioBookReview = async (id, reviewData) => {
  const audioBook = await AudioBook.findById(id);
  if (!audioBook) return null;

  const normalizedRating = Math.min(5, Math.max(1, Number(reviewData.rating) || 5));
  const existingReview = (audioBook.reviews || []).find((review) => String(review.userId) === String(reviewData.userId));

  if (existingReview) {
    existingReview.rating = normalizedRating;
    existingReview.comment = reviewData.comment || existingReview.comment || "";
    existingReview.userName = reviewData.userName || existingReview.userName || "Customer";
    existingReview.createdAt = existingReview.createdAt || new Date();
  } else {
    audioBook.reviews.push({
      userId: reviewData.userId,
      userName: reviewData.userName || "Customer",
      rating: normalizedRating,
      comment: reviewData.comment || "",
      createdAt: new Date(),
    });
  }

  const reviewCount = (audioBook.reviews || []).length;
  const averageRating = reviewCount > 0
    ? Number(((audioBook.reviews || []).reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1))
    : 0;

  audioBook.reviewCount = reviewCount;
  audioBook.rating = averageRating;

  await audioBook.save();
  return audioBook;
};

/**
 * Add a new audio book to the catalog.
 */
export const addNewAudioBook = async (audioBookData) => {
  const newAudioBook = new AudioBook(audioBookData);
  return await newAudioBook.save();
};

/**
 * Modify an existing audio book.
 */
export const modifyAudioBook = async (id, audioBookData) => {
  return await AudioBook.findByIdAndUpdate(id, audioBookData, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete an audio book from the catalog.
 */
export const removeAudioBook = async (id) => {
  return await AudioBook.findByIdAndDelete(id);
};

/**
 * Delete multiple audio books from the catalog.
 */
export const removeMultipleAudioBooks = async (ids) => {
  return await AudioBook.deleteMany({ _id: { $in: ids } });
};
