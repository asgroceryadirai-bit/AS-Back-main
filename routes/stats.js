import { Router } from "express";
import { getStats } from "../controllers/statsController.js";

const router = Router();

// GET shop analytical stats for the Admin Dashboard
router.get("/", getStats);

export default router;
