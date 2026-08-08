import * as orderService from "../services/orderService.js";

// GET all orders
export const getOrders = async (req, res) => {
  try {
    const { userId } = req.query;
    const orders = await orderService.fetchOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// GET single order
export const getOrderById = async (req, res) => {
  try {
    const order = await orderService.fetchOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

// POST create order
export const createOrder = async (req, res) => {
  try {
    const customerIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "2401:4900:4dd6:1e2e:bab6:cdda:ee9b:b29d";
    const newOrder = await orderService.addNewOrder(req.body, customerIp);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// PUT update entire order (Billing, Shipping, items, total etc.)
export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await orderService.modifyOrder(req.params.id, req.body);
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
};

// PUT update order status & add history notes
export const updateOrderStatus = async (req, res) => {
  try {
    const updatedOrder = await orderService.modifyOrderStatus(req.params.id, req.body);
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    if (error.message && /out of stock|unavailable for purchase|available/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update order status" });
  }
};

export const updateOrderTracking = async (req, res) => {
  try {
    const { trackingNumber } = req.body;
    if (!trackingNumber || !String(trackingNumber).trim()) {
      return res.status(400).json({ error: "Tracking number is required." });
    }

    const updatedOrder = await orderService.modifyOrderTracking(req.params.id, String(trackingNumber).trim());
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order tracking:", error);
    res.status(500).json({ error: "Failed to update order tracking" });
  }
};

// DELETE order
export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await orderService.removeOrder(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
};
