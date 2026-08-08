import { Router } from "express";
import {
  getAudioBooks,
  getAudioBookById,
  createAudioBook,
  updateAudioBook,
  deleteAudioBook,
  bulkDeleteAudioBooks,
  getAudioBookReviews,
  addAudioBookReview
} from "../controllers/audioBookController.js";
import { validateAudioBookPayload } from "../validators/dataValidator.js";

const router = Router();

// GET all audio books (with search & category filter support)
router.get("/", getAudioBooks);

// Reviews for a specific audio book
router.get("/:id/reviews", getAudioBookReviews);
router.post("/:id/reviews", addAudioBookReview);

// GET single audio book
router.get("/:id", getAudioBookById);

// POST bulk delete audio books
router.post("/bulk-delete", bulkDeleteAudioBooks);

// POST create audio book
router.post("/", validateAudioBookPayload, createAudioBook);

// PUT update audio book
router.put("/:id", validateAudioBookPayload, updateAudioBook);

// DELETE audio book
router.delete("/:id", deleteAudioBook);

export default router;
