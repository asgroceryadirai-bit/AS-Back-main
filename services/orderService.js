import crypto from 'crypto';
import { Order } from "../models/Order.js";
import { Book } from "../models/Book.js";
import { Membership } from "../models/Membership.js";
import { ShippingConfig } from "../models/ShippingConfig.js";
import { createPaymentLog } from './paymentLogService.js';
import { 
  sendPaymentNotificationToAdmin, 
  sendOrderStatusUpdateToAdmin, 
  sendPaymentSuccessToCustomer, 
  sendPaymentFailedToCustomer, 
  sendTrackingUpdateToCustomer,
  sendOutOfIndiaOrderNotificationToAdmin,
  sendOutOfIndiaOrderNotificationToCustomer
} from './emailService.js';
import { getStockAvailabilityForItem, findProductForOrderItem, isDigitalProductItem } from '../utils/stockUtils.js';
import { validateCouponForCart, markCouponAsUsed } from './couponService.js';
import { sendTelegramOrderAlert } from './telegramService.js';

// Membership discount rates per plan
const MEMBERSHIP_DISCOUNT_RATES = {
  silver:   0.10,
  gold:     0.15,
  platinum: 0.20,
};

/**
 * Fetch all orders, optionally filtered by userId.
 */
export const fetchOrders = async (userId) => {
  const filter = userId ? { userId: String(userId) } : {};
  return await Order.find(filter).sort({ createdAt: -1 }).exec();
};

/**
 * Fetch a single order by ID.
 */
export const fetchOrderById = async (id) => {
  return await Order.findById(id);
};

export const getRegionGroup = (address = {}) => {
  const country = (address.country || '').trim().toLowerCase();
  // Dynamic shipment price is ONLY for India. For outside India, it's 0.
  if (country && country !== 'india') {
    return null; 
  }

  const state = (address.state || '').trim().toLowerCase();
  const city = (address.city || '').trim().toLowerCase();
  const district = (address.district || '').trim().toLowerCase();
  const street1 = (address.streetAddress1 || '').trim().toLowerCase();
  const street2 = (address.streetAddress2 || '').trim().toLowerCase();

  const matchesAny = (texts, patterns) => {
    return texts.some(text => patterns.some(pattern => text.includes(pattern)));
  };

  const addressTexts = [city, district, street1, street2];

  // 1. Group 3 overrides: Calicut, Mumbai, Delhi
  if (matchesAny(addressTexts, ['calicut', 'kozhikode', 'kozhikkode'])) {
    return 'group3';
  }
  if (state.includes('mumbai') || matchesAny(addressTexts, ['mumbai', 'bombay'])) {
    return 'group3';
  }
  if (state.includes('delhi') || matchesAny([city, district], ['delhi'])) {
    return 'group3';
  }

  // 2. Group 2 overrides: Hyderabad & Secunderabad
  if (matchesAny(addressTexts, ['hyderabad', 'secunderabad', 'secendrabad'])) {
    return 'group2';
  }

  // 3. Group 1: Tamil Nadu
  if (state.includes('tamil nadu') || state === 'tn') {
    return 'group1';
  }

  // 4. Group 2 states: AP, Karnataka, Kerala, Telungana
  if (
    state.includes('andhra pradesh') || state === 'ap' ||
    state.includes('karnataka') || state === 'ka' ||
    state.includes('kerala') || state === 'kl' ||
    state.includes('telangana') || state.includes('telungana') || state === 'ts' || state === 'tg'
  ) {
    return 'group2';
  }

  // 5. Fallback for all other India orders -> Group 3
  return 'group3';
};

/**
 * Compute order totals using authoritative product prices from DB.
 * @param {Array}  items
 * @param {string} couponCode
 * @param {boolean} isOutOfIndia
 * @param {object} shippingDetails
 * @param {object} billingDetails
 * @param {string} userId  — used to look up active membership discount
 */
export const computeOrderTotals = async (items = [], couponCode, isOutOfIndia = false, shippingDetails = {}, billingDetails = {}, userId = null) => {
  let subtotal = 0;
  let physicalSubtotal = 0; // only non-digital items
  let totalQuantity = 0;
  let isDigitalOnly = true;

  for (const item of items || []) {
    const qty = Number(item.quantity || 0);
    totalQuantity += qty;

    const found = await findProductForOrderItem(item);
    let price = 0;
    let isDigital = false;
    if (found && found.product) {
      price = (typeof found.product.discountPrice === 'number' && found.product.discountPrice > 0)
        ? found.product.discountPrice
        : Number(found.product.price || 0);
      isDigital = isDigitalProductItem(item);
      if (!isDigital) isDigitalOnly = false;
    } else if (item.product && typeof item.product.price === 'number') {
      // fallback to product object in payload
      price = (typeof item.product.discountPrice === 'number' && item.product.discountPrice > 0)
        ? item.product.discountPrice
        : Number(item.product.price || 0);
      isDigital = isDigitalProductItem(item);
      if (!isDigital) isDigitalOnly = false;
    }

    subtotal += price * qty;
    if (!isDigital) physicalSubtotal += price * qty;
  }

  let discount = 0;
  let isFreeShippingCoupon = false;
  const code = (couponCode || '').toString().trim().toUpperCase();
  if (code) {
    const validation = await validateCouponForCart({
      code,
      cart: items.map((item) => ({ product: item.product })) || [],
      subtotal,
      isDigitalOnly,
      shippingAddress: shippingDetails || billingDetails || {}
    });
    if (validation.valid) {
      discount = Number(validation.discount || 0);
      if (validation.allowFreeShipping || validation.coupon?.allowFreeShipping) {
        isFreeShippingCoupon = true;
      }
    }
  }

  // Shipping: ₹0 for all digital orders, free shipping coupons, or subtotal >= ₹500
  // Skip shipping charges for international (out of India) orders
  let shipping = 0;
  if (!isDigitalOnly && !isOutOfIndia && !isFreeShippingCoupon) {
    if (subtotal >= 500) {
      shipping = 0;
    } else {
      let config = await ShippingConfig.findOne();
      if (!config) {
        config = { group1: 30, group2: 30, group3: 30 };
      }
      const address = shippingDetails || billingDetails || {};
      const group = getRegionGroup(address);
      const rate = (group && config[group]) ?? 30;
      shipping = rate * Math.max(1, totalQuantity);
    }
  }

  // Membership discount — applied on physical books only
  let membershipDiscount = 0;
  let membershipPlan = '';
  if (userId && physicalSubtotal > 0) {
    try {
      const activeMembership = await Membership.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (activeMembership) {
        const rate = MEMBERSHIP_DISCOUNT_RATES[activeMembership.plan] || 0;
        membershipDiscount = Math.round(physicalSubtotal * rate * 100) / 100;
        membershipPlan = activeMembership.plan;
      }
    } catch (err) {
      console.warn('Failed to fetch membership for discount:', err);
    }
  }

  const total = Math.max(0, subtotal + shipping - discount - membershipDiscount);
  return { subtotal, shipping, discount, membershipDiscount, membershipPlan, total };
};

/**
 * Initialize and add a new order to the database.
 */
export const addNewOrder = async (orderData, customerIp) => {
  const {
    userId,
    items,
    couponCode,
    // total will be computed server-side
    status,
    trackingId,
    shippingAddress,
    billingDetails,
    shippingDetails,
    orderNotes,
    paymentMethod,
    razorpayOrderId
  } = orderData;

  const initialStatus = status || "pending";
  const historyEntry = {
    status: initialStatus,
    updatedAt: new Date(),
    note: `Order initialized. Status set to ${initialStatus}.`
  };

  // Overwrite item prices with actual selling prices (discountPrice if applicable)
  const finalItems = [];
  for (const item of items || []) {
    const found = await findProductForOrderItem(item);
    let price = 0;
    if (found && found.product) {
      price = (typeof found.product.discountPrice === 'number' && found.product.discountPrice > 0)
        ? found.product.discountPrice
        : Number(found.product.price || 0);
    } else if (item.product && typeof item.product.price === 'number') {
      price = (typeof item.product.discountPrice === 'number' && item.product.discountPrice > 0)
        ? item.product.discountPrice
        : Number(item.product.price || 0);
    }
    const itemCopy = JSON.parse(JSON.stringify(item));
    if (itemCopy.product) {
      itemCopy.product.price = price;
    }
    finalItems.push(itemCopy);
  }

  // Recompute totals on the server using DB prices and reliable sources
  const isOutOfIndia = (shippingDetails && shippingDetails.country && shippingDetails.country.toLowerCase() !== 'india') || (billingDetails && billingDetails.country && billingDetails.country.toLowerCase() !== 'india');
  const { subtotal, shipping, discount, membershipDiscount, membershipPlan, total: computedTotal } = await computeOrderTotals(finalItems, couponCode, isOutOfIndia, shippingDetails, billingDetails, userId);

  // Generate a sequential order number starting with 269001
  const lastOrderWithNumber = await Order.findOne({ 
    orderNumber: { $exists: true, $ne: "", $ne: null } 
  }).sort({ orderNumber: -1 }).exec();

  let nextNum = 269001;
  if (lastOrderWithNumber && lastOrderWithNumber.orderNumber) {
    const lastNum = parseInt(lastOrderWithNumber.orderNumber, 10);
    if (!isNaN(lastNum)) {
      nextNum = Math.max(lastNum + 1, 269001);
    }
  }
  const orderNumber = String(nextNum).padStart(6, '0');

  const newOrder = new Order({
    userId,
    orderNumber,
    items: finalItems,
    total: computedTotal,
    subtotal,
    shipping,
    discount,
    membershipDiscount: membershipDiscount || 0,
    membershipPlan: membershipPlan || '',
    status: initialStatus,
    trackingId,
    shippingAddress: shippingAddress || (billingDetails ? `${billingDetails.firstName} ${billingDetails.lastName}, ${billingDetails.streetAddress1}, ${billingDetails.city}` : ""),
    couponCode: couponCode || "",
    billingDetails,
    shippingDetails,
    orderNotes,
    paymentMethod: paymentMethod || "Online",
    razorpayOrderId,
    customerIp,
    statusHistory: [historyEntry]
  });

  const savedOrder = await newOrder.save();

  // Send real-time Telegram order notification to Admin
  try {
    sendTelegramOrderAlert(savedOrder);
  } catch (tgErr) {
    console.warn("Telegram notification error:", tgErr);
  }

  if (couponCode && savedOrder && ["paid", "processing", "completed"].includes(initialStatus)) {
    try {
      await markCouponAsUsed({ code: couponCode, userId });
    } catch (err) {
      console.warn('Failed to mark coupon as used:', err);
    }
  }

  if (isOutOfIndia) {
    try {
      await sendOutOfIndiaOrderNotificationToAdmin(savedOrder);
      await sendOutOfIndiaOrderNotificationToCustomer(savedOrder);
    } catch (err) {
      console.error("Failed to send Out of India email notifications:", err);
    }
  }

  return savedOrder;
};

/**
 * Modify an existing order details (Billing, Shipping, items, total, etc.).
 */
export const modifyOrder = async (id, updateData) => {
  const { billingDetails, shippingDetails, items, total, status, paymentMethod, orderNotes } = updateData;
  const order = await Order.findById(id);
  if (!order) return null;

  if (billingDetails) order.billingDetails = billingDetails;
  if (shippingDetails) order.shippingDetails = shippingDetails;
  if (items) {
    // Overwrite item prices with actual selling prices (discountPrice if applicable)
    const finalItems = [];
    for (const item of items || []) {
      const found = await findProductForOrderItem(item);
      let price = 0;
      if (found && found.product) {
        price = (typeof found.product.discountPrice === 'number' && found.product.discountPrice > 0)
          ? found.product.discountPrice
          : Number(found.product.price || 0);
      } else if (item.product && typeof item.product.price === 'number') {
        price = (typeof item.product.discountPrice === 'number' && item.product.discountPrice > 0)
          ? item.product.discountPrice
          : Number(item.product.price || 0);
      }
      const itemCopy = JSON.parse(JSON.stringify(item));
      if (itemCopy.product) {
        itemCopy.product.price = price;
      }
      finalItems.push(itemCopy);
    }
    order.items = finalItems;

    // Recompute totals whenever items change to prevent client tampering
    try {
      const isOutOfIndia = (order.shippingDetails && order.shippingDetails.country && order.shippingDetails.country.toLowerCase() !== 'india') || (order.billingDetails && order.billingDetails.country && order.billingDetails.country.toLowerCase() !== 'india');
      const { subtotal, shipping, discount, total: computedTotal } = await computeOrderTotals(order.items, updateData.couponCode || order.couponCode, isOutOfIndia);
      order.subtotal = subtotal;
      order.shipping = shipping;
      order.discount = discount;
      order.total = computedTotal;
    } catch (err) {
      console.error('Failed to recompute totals during order update:', err);
    }
  }
  if (status) {
    const oldStatus = order.status;
    if (oldStatus !== status) {
      order.status = status;
      order.statusHistory.push({
        status: status,
        updatedAt: new Date(),
        note: `Order status changed from ${oldStatus.toUpperCase()} to ${status.toUpperCase()} via Admin Dashboard update.`
      });
    }
  }
  if (paymentMethod) order.paymentMethod = paymentMethod;
  if (orderNotes) order.orderNotes = orderNotes;

  // Append system note for billing/shipping update
  order.statusHistory.push({
    status: order.status,
    updatedAt: new Date(),
    note: "Order billing and shipping details were updated by Administrator."
  });

  return await order.save();
};

/**
 * Modify order status, handle Razorpay metadata, and reduce book stocks if transition is from pending.
 */
export const modifyOrderStatus = async (id, statusData) => {
  const { status, trackingId, trackingNumber, razorpayPaymentId, razorpayOrderId, razorpaySignature, note } = statusData;
  const order = await Order.findById(id);
  if (!order) return null;

  const oldStatus = order.status;
  const oldTracking = order.trackingNumber;
  let trackingUpdated = false;

  if (status) order.status = status;
  if (trackingId) order.trackingId = trackingId;
  if (trackingNumber !== undefined) {
    const trimmed = String(trackingNumber || '').trim();
    if (trimmed && oldTracking !== trimmed) {
      order.trackingNumber = trimmed;
      order.trackingSubmittedAt = new Date();
      trackingUpdated = true;
    }
  }
  // If Razorpay metadata provided, verify signature when possible before trusting payment
  if (razorpayPaymentId && razorpayOrderId && razorpaySignature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
      if (expected !== razorpaySignature) {
        throw new Error('Invalid payment signature. Payment verification failed.');
      }
    } else {
      console.warn('Razorpay secret not configured; skipping signature verification (dev mode).');
    }
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpayOrderId = razorpayOrderId;
    order.razorpaySignature = razorpaySignature;
  } else {
    if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
    if (razorpayOrderId) order.razorpayOrderId = razorpayOrderId;
    if (razorpaySignature) order.razorpaySignature = razorpaySignature;
  }

  // Build timeline notes
  const systemNotes = [];
  if (status && oldStatus !== status) {
    systemNotes.push(`Order status changed from ${oldStatus} to ${status}.`);
  }
  if (razorpayPaymentId) {
    systemNotes.push(`Razorpay payment successful. Payment ID: ${razorpayPaymentId}`);
  }
  if (razorpayOrderId) {
    systemNotes.push(`Razorpay Order ID associated: ${razorpayOrderId}`);
  }
  if (note) {
    systemNotes.push(note);
  }

  // Add notes to statusHistory
  systemNotes.forEach(n => {
    order.statusHistory.push({
      status: status || order.status,
      updatedAt: new Date(),
      note: n
    });
  });

  // If order was transitioned to paid/processing/completed from pending, validate stock first and then adjust it
  if (status && ["paid", "processing", "completed"].includes(status) && ["pending"].includes(oldStatus)) {
    for (const item of order.items || []) {
      const availability = await getStockAvailabilityForItem(item);
      if (!availability.available) {
        throw new Error(availability.error || "One or more items are unavailable for purchase.");
      }
    }

    for (const item of order.items || []) {
      try {
        if (item.productId && !item.productId.startsWith("guest-") && !item.productId.includes("-")) {
          const book = await Book.findById(item.productId);
          if (book) {
            const oldStock = book.stock;
            const newStock = Math.max(0, oldStock - item.quantity);
            book.stock = newStock;
            await book.save();

            // Record stock reduction log
            order.statusHistory.push({
              status: status,
              updatedAt: new Date(),
              note: `Stock levels reduced: ${book.name} (${oldStock} -> ${newStock})`
            });
          }
        }
      } catch (err) {
        console.error("Failed to decrement stock for item:", item.productId, err);
      }
    }

    if (order.couponCode) {
      try {
        await markCouponAsUsed({ code: order.couponCode, userId: order.userId });
      } catch (err) {
        console.warn('Failed to mark coupon as used on payment completion:', err);
      }
    }
  }

  const saved = await order.save();

  // Create Payment Log entry when payment metadata is present or status indicates payment
  try {
    const maybeAmount = saved.total || 0;
    const bookNames = (saved.items || []).map(i => i.product?.name || '').filter(Boolean);
    const paymentEntry = {
      customerName: `${saved.billingDetails?.firstName || ''} ${saved.billingDetails?.lastName || ''}`.trim(),
      customerId: saved.userId || '',
      bookNames,
      orderId: saved.id || saved._id,
      paymentId: saved.razorpayPaymentId || '',
      razorpayOrderId: saved.razorpayOrderId || '',
      paymentStatus: (saved.status === 'completed' || saved.status === 'paid' || saved.status === 'processing') ? 'Paid' : (saved.status || 'pending'),
      amount: maybeAmount,
      currency: 'INR',
      paymentMethod: saved.paymentMethod || '',
      customerEmail: saved.billingDetails?.email || '',
      customerPhone: saved.billingDetails?.phone || '',
      notes: saved.orderNotes || '',
      source: 'Website Book Purchase',
      meta: {
        statusHistory: saved.statusHistory || []
      }
    };
    await createPaymentLog(paymentEntry);
  } catch (err) {
    console.error('Failed to create payment log entry:', err);
  }

  // Send admin email notifications
  try {
    const isPaidTransition = status && ['paid', 'processing', 'completed'].includes(status);
    const wasNotPaid = oldStatus && !['paid', 'processing', 'completed'].includes(oldStatus);

    if (isPaidTransition && wasNotPaid) {
      // Payment just received – send payment notification
      await sendPaymentNotificationToAdmin(saved);
      await sendPaymentSuccessToCustomer(saved);
    } else if (status && oldStatus !== status) {
      // Any other status change – send status update notification
      await sendOrderStatusUpdateToAdmin(saved, oldStatus);
      if (status === 'failed') {
        await sendPaymentFailedToCustomer(saved);
      }
    }
    
    if (trackingUpdated) {
      await sendTrackingUpdateToCustomer(saved);
    }
  } catch (err) {
    console.error('Failed to send admin or customer email notification:', err);
  }

  return saved;
};

/**
 * Delete an order by ID.
 */
export const modifyOrderTracking = async (id, trackingNumber) => {
  const order = await Order.findById(id);
  if (!order) return null;
  const oldTracking = order.trackingNumber;
  order.trackingNumber = trackingNumber;
  order.trackingSubmittedAt = new Date();
  order.statusHistory.push({
    status: order.status,
    updatedAt: new Date(),
    note: `Tracking number set to ${trackingNumber}.`
  });
  const saved = await order.save();
  
  if (trackingNumber && String(trackingNumber).trim() !== oldTracking) {
    try {
      await sendTrackingUpdateToCustomer(saved);
    } catch (err) {
      console.error('Failed to send tracking update email to customer:', err);
    }
  }
  
  return saved;
};

export const removeOrder = async (id) => {
  return await Order.findByIdAndDelete(id);
};
