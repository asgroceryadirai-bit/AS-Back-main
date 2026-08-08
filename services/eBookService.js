import { EBook } from "../models/EBook.js";

const normalizeEBookRating = (ebook) => {
  if (!ebook) return ebook;
  const data = ebook.toObject ? ebook.toObject() : ebook;
  const reviewCount = Number(data.reviewCount || 0);
  return {
    ...data,
    id: data.id || (data._id ? String(data._id) : undefined),
    rating: reviewCount > 0 ? Number(data.rating || 0) : 0,
    reviewCount,
  };
};

/**
 * Fetch all e-books from the database matching the criteria.
 */
export const queryEBooks = async ({ category, search, limit, fields }) => {
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

  let q = EBook.find(queryCond).lean();
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

  const ebooks = await q.exec();
  return ebooks.map(normalizeEBookRating);
};

/**
 * Fetch a single e-book by ID.
 */
export const fetchEBookById = async (id) => {
  const ebook = await EBook.findById(id);
  return normalizeEBookRating(ebook);
};

export const fetchEBookReviews = async (id) => {
  const ebook = await EBook.findById(id).select("reviews rating reviewCount");
  return ebook ? ebook.reviews : [];
};

export const addEBookReview = async (id, reviewData) => {
  const ebook = await EBook.findById(id);
  if (!ebook) return null;

  const normalizedRating = Math.min(5, Math.max(1, Number(reviewData.rating) || 5));
  const existingReview = (ebook.reviews || []).find(
    (review) => String(review.userId) === String(reviewData.userId)
  );

  if (existingReview) {
    existingReview.rating = normalizedRating;
    existingReview.comment = reviewData.comment || existingReview.comment || "";
    existingReview.userName = reviewData.userName || existingReview.userName || "Customer";
    existingReview.createdAt = existingReview.createdAt || new Date();
  } else {
    ebook.reviews.push({
      userId: reviewData.userId,
      userName: reviewData.userName || "Customer",
      rating: normalizedRating,
      comment: reviewData.comment || "",
      createdAt: new Date(),
    });
  }

  const reviewCount = (ebook.reviews || []).length;
  const averageRating =
    reviewCount > 0
      ? Number(
          (
            (ebook.reviews || []).reduce(
              (sum, review) => sum + Number(review.rating || 0),
              0
            ) / reviewCount
          ).toFixed(1)
        )
      : 0;

  ebook.reviewCount = reviewCount;
  ebook.rating = averageRating;

  await ebook.save();
  return normalizeEBookRating(ebook);
};

/**
 * Add a new e-book to the catalog.
 */
export const addNewEBook = async (ebookData) => {
  const newEBook = new EBook(ebookData);
  return await newEBook.save();
};

/**
 * Modify an existing e-book.
 */
export const modifyEBook = async (id, ebookData) => {
  return await EBook.findByIdAndUpdate(id, ebookData, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete an e-book from the catalog.
 */
export const removeEBook = async (id) => {
  return await EBook.findByIdAndDelete(id);
};

/**
 * Delete multiple e-books from the catalog.
 */
export const removeMultipleEBooks = async (ids) => {
  return await EBook.deleteMany({ _id: { $in: ids } });
};
