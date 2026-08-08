import { Book } from "../models/Book.js";
import { Order } from "../models/Order.js";
import { ALL_BOOKS } from "../lib/bookCatalog.js";

const normalizeBookRating = (book) => {
  if (!book) return book;
  const data = book.toObject ? book.toObject() : book;
  const reviewCount = Number(data.reviewCount || 0);
  return {
    ...data,
    id: data.id || (data._id ? String(data._id) : undefined),
    rating: reviewCount > 0 ? Number(data.rating || 0) : 0,
    reviewCount,
  };
};

/**
 * Fetch all books from the database matching the criteria.
 */
export const queryBooks = async ({ category, search, limit, fields }) => {
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

  let q = Book.find(queryCond).lean();
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

  const books = await q.exec();
  return books.map(normalizeBookRating);
};

export const fetchTopSoldBooks = async (limit = 12) => {
  const topBooksAgg = await Order.aggregate([
    { $match: { status: { $in: ["paid", "shipped", "delivered", "processing", "completed"] } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: Number(limit) },
  ]);

  const topBookIds = topBooksAgg
    .map((entry) => String(entry._id))
    .filter(Boolean);

  const existingBooks = await Book.find({ _id: { $in: topBookIds } }).select("-reviews").lean().exec();
  const bookMap = new Map(existingBooks.map((book) => [String(book._id), normalizeBookRating(book)]));

  return topBooksAgg
    .map((entry) => {
      const book = bookMap.get(String(entry._id));
      if (!book) return null;

      return {
        ...book,
        id: String(book._id),
        productId: String(book._id),
        totalSold: entry.totalSold,
      };
    })
    .filter(Boolean);
};

/**
 * Fetch a single book by ID.
 */
export const fetchBookById = async (id) => {
  const book = await Book.findById(id);
  return normalizeBookRating(book);
};

export const fetchBookReviews = async (id) => {
  const book = await Book.findById(id).select("reviews rating reviewCount");
  return book ? book.reviews : [];
};

export const addBookReview = async (id, reviewData) => {
  const book = await Book.findById(id);
  if (!book) return null;

  const normalizedRating = Math.min(5, Math.max(1, Number(reviewData.rating) || 5));
  const existingReview = (book.reviews || []).find((review) => String(review.userId) === String(reviewData.userId));

  if (existingReview) {
    existingReview.rating = normalizedRating;
    existingReview.comment = reviewData.comment || existingReview.comment || "";
    existingReview.userName = reviewData.userName || existingReview.userName || "Customer";
    existingReview.createdAt = existingReview.createdAt || new Date();
  } else {
    book.reviews.push({
      userId: reviewData.userId,
      userName: reviewData.userName || "Customer",
      rating: normalizedRating,
      comment: reviewData.comment || "",
      createdAt: new Date(),
    });
  }

  const reviewCount = (book.reviews || []).length;
  const averageRating = reviewCount > 0
    ? Number(((book.reviews || []).reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1))
    : 0;

  book.reviewCount = reviewCount;
  book.rating = averageRating;

  await book.save();
  return book;
};

/**
 * Add a new book to the catalog.
 */
export const addNewBook = async (bookData) => {
  const newBook = new Book(bookData);
  return await newBook.save();
};

/**
 * Modify an existing book.
 */
export const modifyBook = async (id, bookData) => {
  return await Book.findByIdAndUpdate(id, bookData, {
    new: true,
    runValidators: true,
  });
};

/**
 * Delete a book from the catalog.
 */
export const removeBook = async (id) => {
  return await Book.findByIdAndDelete(id);
};

/**
 * Seed catalog with pre-defined publications.
 */
export const seedCatalog = async (force) => {
  const count = await Book.countDocuments();

  if (count > 0 && !force) {
    return {
      alreadySeeded: true,
      count,
      message: "Database already contains books. Use force: true to re-seed.",
    };
  }

  if (force) {
    await Book.deleteMany({});
    console.log("Cleared existing books collection for force re-seeding.");
  }

  const booksToInsert = ALL_BOOKS.map((b) => {
    const { id, ...rest } = b;
    return rest;
  });

  const inserted = await Book.insertMany(booksToInsert);
  return {
    seededCount: inserted.length,
    message: `Successfully seeded ${inserted.length} publications into the MongoDB catalog!`,
  };
};

/**
 * Delete multiple books from the catalog.
 */
export const removeMultipleBooks = async (ids) => {
  return await Book.deleteMany({ _id: { $in: ids } });
};