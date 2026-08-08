import express from "express";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { Membership } from "../models/Membership.js";

const router = express.Router();

// Sync customer detail on Google Login / Auth check
router.post("/sync", async (req, res) => {
  try {
    const { uid, displayName, email, photoURL, phoneNumber, authProvider } = req.body;
    if (!uid) {
      return res.status(400).json({ success: false, error: "UID is required" });
    }

    const updateData = {
      displayName: displayName || "",
      email: email || "",
      photoURL: photoURL || "",
      lastLoginAt: new Date(),
    };
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (authProvider) updateData.authProvider = authProvider;

    const customer = await Customer.findOneAndUpdate(
      { uid },
      { $set: updateData, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true }
    );

    res.json({ success: true, customer });
  } catch (error) {
    console.error("Error syncing customer:", error);
    res.status(500).json({ success: false, error: "Failed to sync customer details" });
  }
});

// GET all customers with aggregated order and membership details
router.get("/", async (req, res) => {
  try {
    const [dbCustomers, allOrders, allMemberships] = await Promise.all([
      Customer.find().sort({ lastLoginAt: -1 }),
      Order.find().sort({ createdAt: -1 }),
      Membership.find().sort({ createdAt: -1 }),
    ]);

    const customerMap = new Map();

    // 1. Add DB Customers
    dbCustomers.forEach((c) => {
      const doc = c.toObject();
      customerMap.set(doc.uid, {
        ...doc,
        id: doc._id.toString(),
        totalOrders: 0,
        totalSpent: 0,
        orders: [],
        memberships: [],
        activeMembership: null,
        phone: doc.phoneNumber || "",
        latestAddress: "",
      });
    });

    // 2. Aggregate Orders
    allOrders.forEach((ord) => {
      const ordObj = ord.toObject ? ord.toObject() : ord;
      const uid = ordObj.userId;
      const email = (ordObj.billingDetails?.email || "").toLowerCase();

      let matchedCust = null;
      if (uid && customerMap.has(uid)) {
        matchedCust = customerMap.get(uid);
      } else if (email) {
        for (const cust of customerMap.values()) {
          if (cust.email && cust.email.toLowerCase() === email) {
            matchedCust = cust;
            break;
          }
        }
      }

      // If order user isn't in customerMap yet (legacy order before Customer collection), create entry
      if (!matchedCust && (uid || email)) {
        const key = uid || `email_${email}`;
        const name =
          ((ordObj.billingDetails?.firstName || "") +
          " " +
          (ordObj.billingDetails?.lastName || "")).trim();
        matchedCust = {
          id: key,
          uid: uid || key,
          displayName: name || (email ? email.split("@")[0] : "Customer"),
          email: email || "",
          photoURL: "",
          phoneNumber: ordObj.billingDetails?.phone || "",
          authProvider: "Google / Checkout",
          lastLoginAt: ordObj.createdAt,
          createdAt: ordObj.createdAt,
          totalOrders: 0,
          totalSpent: 0,
          orders: [],
          memberships: [],
          activeMembership: null,
          phone: ordObj.billingDetails?.phone || "",
          latestAddress: "",
        };
        customerMap.set(key, matchedCust);
      }

      if (matchedCust) {
        matchedCust.orders.push(ordObj);
        matchedCust.totalOrders += 1;
        if (ordObj.status !== "cancelled" && ordObj.status !== "failed") {
          matchedCust.totalSpent += Number(ordObj.total || 0);
        }
        if (!matchedCust.phone && ordObj.billingDetails?.phone) {
          matchedCust.phone = ordObj.billingDetails.phone;
        }
        if (!matchedCust.latestAddress && ordObj.billingDetails) {
          const b = ordObj.billingDetails;
          const addr = [b.streetAddress1, b.streetAddress2, b.city, b.state, b.pinCode]
            .filter(Boolean)
            .join(", ");
          matchedCust.latestAddress = addr;
        }
      }
    });

    // 3. Aggregate Memberships
    allMemberships.forEach((mem) => {
      const memObj = mem.toObject ? mem.toObject() : mem;
      const uid = memObj.userId;
      const email = (memObj.userEmail || "").toLowerCase();

      let matchedCust = null;
      if (uid && customerMap.has(uid)) {
        matchedCust = customerMap.get(uid);
      } else if (email) {
        for (const cust of customerMap.values()) {
          if (cust.email && cust.email.toLowerCase() === email) {
            matchedCust = cust;
            break;
          }
        }
      }

      if (matchedCust) {
        matchedCust.memberships.push(memObj);
        if (
          memObj.status === "active" &&
          (!matchedCust.activeMembership ||
            new Date(memObj.endDate) > new Date(matchedCust.activeMembership.endDate))
        ) {
          matchedCust.activeMembership = memObj;
        }
      }
    });

    const customersList = Array.from(customerMap.values());
    res.json({ success: true, customers: customersList });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
  }
});

// DELETE customer by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id.startsWith("demo-") || id.startsWith("email_")) {
      return res.json({ success: true, message: "Virtual entry removed" });
    }
    await Customer.findByIdAndDelete(id);
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ success: false, error: "Failed to delete customer" });
  }
});

export default router;
