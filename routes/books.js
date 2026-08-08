import { Router } from "express";
import {
  getBooks,
  getBookById,
  getTopSoldBooks,
  createBook,
  updateBook,
  deleteBook,
  seedBooks,
  bulkDeleteBooks,
  getBookReviews,
  addBookReview
} from "../controllers/bookController.js";
import { validateBookPayload } from "../validators/dataValidator.js";

const router = Router();

// GET all books (with search & category filter support)
router.get("/", getBooks);

// GET top sold books
router.get("/top-sold", getTopSoldBooks);

// Reviews for a specific book
router.get("/:id/reviews", getBookReviews);
router.post("/:id/reviews", addBookReview);

// GET single book
router.get("/:id", getBookById);

// POST bulk delete books
router.post("/bulk-delete", bulkDeleteBooks);



// POST create book
router.post("/", validateBookPayload, createBook);

// PUT update book
router.put("/:id", validateBookPayload, updateBook);

// DELETE book
router.delete("/:id", deleteBook);

// POST seed catalog books
router.post("/seed", seedBooks);

export default router;

