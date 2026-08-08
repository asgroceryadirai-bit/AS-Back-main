import express from "express";
import { loginAdmin, seedAdmins } from "../controllers/adminController.js";

const adminRouter = express.Router();

// POST /api/admin/login  — verify credentials against MongoDB
adminRouter.post("/login", loginAdmin);

// POST /api/admin/seed   — one-time seed to populate default admin accounts
adminRouter.post("/seed", seedAdmins);

export default adminRouter;
