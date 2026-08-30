import express from "express";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { Membership } from "../models/Membership.js";

const router = express.Router();

// Direct Mobile Authentication & Registration (No Firebase / No OTP)
router.post("/auth", async (req, res) => {
  try {
    const { phoneNumber, displayName, defaultAddress, city, email, mode = "login" } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Mobile number is required" });
    }

    const cleanDigits = (phoneNumber || "").replace(/\D/g, "");
    const generatedUid = `phone_${cleanDigits}`;
    const last10Digits = cleanDigits.slice(-10);

    // Search by exact phone number, or matching last 10 digits, or uid
    let customer = null;
    if (cleanDigits.length >= 7) {
      customer = await Customer.findOne({
        $or: [
          { uid: generatedUid },
          { uid: `phone_${last10Digits}` },
          { phoneNumber: phoneNumber },
          { phoneNumber: { $regex: `${last10Digits}$` } },
        ],
      });
    } else {
      customer = await Customer.findOne({
        $or: [{ phoneNumber }, { uid: generatedUid }],
      });
    }

    // Look up past orders to retrieve real customer name and address if needed
    const pastOrder = await Order.findOne({
      $or: [
        { userId: generatedUid },
        { userId: customer?.uid },
        { "shippingAddress.phone": { $regex: `${last10Digits}$` } },
        { "billingAddress.phone": { $regex: `${last10Digits}$` } },
        { "shippingAddress.phone": phoneNumber },
      ],
      "shippingAddress.name": { $exists: true, $ne: "" },
    }).sort({ createdAt: -1 });

    const orderName = pastOrder?.shippingAddress?.name || pastOrder?.billingAddress?.name || pastOrder?.customerName || "";
    const orderAddress = pastOrder?.shippingAddress?.streetAddress1 || "";
    const orderCity = pastOrder?.shippingAddress?.city || "Adirampattinam";

    if (customer) {
      // Existing customer login / update
      if (displayName && displayName.trim() && !displayName.startsWith("Customer")) {
        customer.displayName = displayName.trim();
      } else if (!customer.displayName || customer.displayName.startsWith("Customer (") || customer.displayName === "Customer") {
        if (orderName && !orderName.startsWith("Customer")) {
          customer.displayName = orderName;
        }
      }

      if (defaultAddress !== undefined && defaultAddress.trim()) {
        customer.defaultAddress = defaultAddress.trim();
      } else if (!customer.defaultAddress && orderAddress) {
        customer.defaultAddress = orderAddress;
      }

      if (city !== undefined && city.trim()) {
        customer.city = city.trim();
      } else if (!customer.city && orderCity) {
        customer.city = orderCity;
      }

      if (email && email.trim() && (!customer.email || mode === "register")) {
        customer.email = email.trim();
      }
      if (!customer.phoneNumber) {
        customer.phoneNumber = phoneNumber;
      }
      customer.lastLoginAt = new Date();
      await customer.save();

      return res.json({
        success: true,
        customer,
        isNew: false,
        message: "Signed in successfully",
      });
    }

    // New customer registration / first-time phone sign-in
    const resolvedName = (displayName && displayName.trim() && !displayName.startsWith("Customer"))
      ? displayName.trim()
      : (orderName && !orderName.startsWith("Customer") ? orderName : "");

    const newCustomer = await Customer.create({
      uid: generatedUid,
      displayName: resolvedName,
      phoneNumber: phoneNumber,
      defaultAddress: defaultAddress || orderAddress || "",
      city: city || orderCity || "Adirampattinam",
      email: email || "",
      photoURL: "",
      authProvider: "phone",
      lastLoginAt: new Date(),
      createdAt: new Date(),
    });

    res.json({
      success: true,
      customer: newCustomer,
      isNew: true,
      message: "Registered successfully",
    });
  } catch (error) {
    console.error("Error in mobile customer auth:", error);
    res.status(500).json({ success: false, error: "Failed to authenticate customer" });
  }
});

// Update Customer Profile (Name, Default Address, City, Email)
router.post("/update", async (req, res) => {
  try {
    const { uid, phoneNumber, displayName, defaultAddress, city, email } = req.body;
    const cleanDigits = (phoneNumber || "").replace(/\D/g, "");
    const last10Digits = cleanDigits.slice(-10);
    const userUid = uid || (cleanDigits ? `phone_${cleanDigits}` : null);

    if (!userUid && !phoneNumber) {
      return res.status(400).json({ success: false, error: "Customer identification missing" });
    }

    let customer = await Customer.findOne({
      $or: [
        ...(userUid ? [{ uid: userUid }, { uid: `phone_${last10Digits}` }] : []),
        ...(phoneNumber ? [{ phoneNumber }, { phoneNumber: { $regex: `${last10Digits}$` } }] : []),
      ],
    });

    if (!customer) {
      customer = new Customer({
        uid: userUid || `phone_${cleanDigits}`,
        phoneNumber: phoneNumber || "",
        createdAt: new Date(),
      });
    }

    if (displayName !== undefined) customer.displayName = displayName.trim();
    if (defaultAddress !== undefined) customer.defaultAddress = defaultAddress.trim();
    if (city !== undefined) customer.city = city.trim();
    if (email !== undefined) customer.email = email.trim();
    if (phoneNumber && !customer.phoneNumber) customer.phoneNumber = phoneNumber.trim();
    customer.lastLoginAt = new Date();

    await customer.save();

    res.json({ success: true, customer, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating customer profile:", error);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

// Sync customer detail on Mobile Login / Auth check
router.post("/sync", async (req, res) => {
  try {
    const { uid, displayName, defaultAddress, city, email, photoURL, phoneNumber, authProvider } = req.body;
    const cleanDigits = (phoneNumber || "").replace(/\D/g, "");
    const last10Digits = cleanDigits.slice(-10);
    const userUid = uid || (cleanDigits ? `phone_${cleanDigits}` : null);

    if (!userUid && !phoneNumber) {
      return res.json({ success: false, message: "No customer identifier provided" });
    }

    let customer = await Customer.findOne({
      $or: [
        ...(userUid ? [{ uid: userUid }, { uid: `phone_${last10Digits}` }] : []),
        ...(phoneNumber ? [{ phoneNumber }, { phoneNumber: { $regex: `${last10Digits}$` } }] : []),
      ],
    });

    // Look up past orders to resolve real name if needed
    const pastOrder = await Order.findOne({
      $or: [
        ...(userUid ? [{ userId: userUid }] : []),
        ...(customer?.uid ? [{ userId: customer.uid }] : []),
        { "shippingAddress.phone": { $regex: `${last10Digits}$` } },
        { "billingAddress.phone": { $regex: `${last10Digits}$` } },
        ...(phoneNumber ? [{ "shippingAddress.phone": phoneNumber }] : []),
      ],
      "shippingAddress.name": { $exists: true, $ne: "" },
    }).sort({ createdAt: -1 });

    const orderName = pastOrder?.shippingAddress?.name || pastOrder?.billingAddress?.name || pastOrder?.customerName || "";
    const orderAddress = pastOrder?.shippingAddress?.streetAddress1 || "";
    const orderCity = pastOrder?.shippingAddress?.city || "Adirampattinam";

    if (customer) {
      if (displayName && displayName.trim() && !displayName.startsWith("Customer")) {
        customer.displayName = displayName.trim();
      } else if (!customer.displayName || customer.displayName.startsWith("Customer (") || customer.displayName === "Customer") {
        if (orderName && !orderName.startsWith("Customer")) {
          customer.displayName = orderName;
        }
      }

      if (defaultAddress && defaultAddress.trim()) {
        customer.defaultAddress = defaultAddress.trim();
      } else if (!customer.defaultAddress && orderAddress) {
        customer.defaultAddress = orderAddress;
      }

      if (city && city.trim()) {
        customer.city = city.trim();
      } else if (!customer.city && orderCity) {
        customer.city = orderCity;
      }

      if (email && email.trim()) customer.email = email.trim();
      if (photoURL && photoURL.trim()) customer.photoURL = photoURL.trim();
      if (phoneNumber && !customer.phoneNumber) customer.phoneNumber = phoneNumber;
      customer.lastLoginAt = new Date();
      await customer.save();

      return res.json({ success: true, customer });
    }

    // Create new customer record
    const resolvedName = (displayName && displayName.trim() && !displayName.startsWith("Customer"))
      ? displayName.trim()
      : (orderName && !orderName.startsWith("Customer") ? orderName : "");

    customer = await Customer.create({
      uid: userUid || `phone_${cleanDigits}`,
      displayName: resolvedName,
      phoneNumber: phoneNumber || "",
      defaultAddress: defaultAddress || orderAddress || "",
      city: city || orderCity || "Adirampattinam",
      email: email || "",
      photoURL: photoURL || "",
      authProvider: authProvider || "phone",
      lastLoginAt: new Date(),
      createdAt: new Date(),
    });

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
        latestAddress: doc.defaultAddress || "",
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
