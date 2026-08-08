import { Router } from "express";
import {
  getEPubs,
  getEPubById,
  createEPub,
  updateEPub,
  deleteEPub,
  bulkDeleteEPubs,
  getEPubReviews,
  addEPubReview,
} from "../controllers/ePubController.js";
import { validateEPubPayload } from "../validators/dataValidator.js";

const router = Router();

// GET all e-pubs (with search & category filter support)
router.get("/", getEPubs);

// Reviews for a specific e-pub
router.get("/:id/reviews", getEPubReviews);
router.post("/:id/reviews", addEPubReview);

// GET single e-pub
router.get("/:id", getEPubById);

// POST bulk delete e-pubs
router.post("/bulk-delete", bulkDeleteEPubs);

// POST create e-pub
router.post("/", validateEPubPayload, createEPub);

// PUT update e-pub
router.put("/:id", validateEPubPayload, updateEPub);

// DELETE e-pub
router.delete("/:id", deleteEPub);

export default router;
