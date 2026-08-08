import { Router } from "express";
import {
  getEBooks,
  getEBookById,
  createEBook,
  updateEBook,
  deleteEBook,
  bulkDeleteEBooks,
  getEBookReviews,
  addEBookReview,
} from "../controllers/eBookController.js";
import { validateEBookPayload } from "../validators/dataValidator.js";

const router = Router();

// GET all e-books (with search & category filter support)
router.get("/", getEBooks);

// Reviews for a specific e-book
router.get("/:id/reviews", getEBookReviews);
router.post("/:id/reviews", addEBookReview);

// GET single e-book
router.get("/:id", getEBookById);

// POST bulk delete e-books
router.post("/bulk-delete", bulkDeleteEBooks);

// POST create e-book
router.post("/", validateEBookPayload, createEBook);

// PUT update e-book
router.put("/:id", validateEBookPayload, updateEBook);

// DELETE e-book
router.delete("/:id", deleteEBook);

export default router;
