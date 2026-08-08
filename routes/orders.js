import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  updateOrderTracking,
  deleteOrder
} from "../controllers/orderController.js";
import { validateOrderPayload } from "../validators/dataValidator.js";

const router = Router();

// GET all orders
router.get("/", getOrders);

// GET single order
router.get("/:id", getOrderById);

// POST create order
router.post("/", validateOrderPayload, createOrder);

// PUT update entire order (Billing, Shipping, items, total etc.)
router.put("/:id", updateOrder);

// PUT update order status & add history notes
router.put("/:id/status", updateOrderStatus);

// PUT update tracking number
router.put("/:id/tracking", updateOrderTracking);

// DELETE order
router.delete("/:id", deleteOrder);

export default router;
