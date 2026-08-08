import { Router } from "express";
import { uploadBookCover } from "../controllers/booksUploadController.js";

const router = Router();

// POST /api/upload/books/cover
router.post("/cover", uploadBookCover);

export default router;
