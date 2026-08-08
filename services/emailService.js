// Uses Brevo Transactional Email REST API directly (no SDK needed)
// Docs: https://developers.brevo.com/reference/sendtransacemail

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

const formatDateShort = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getOrderNumber = (order) => {
  if (order && order.orderNumber) {
    return order.orderNumber;
  }
  const id = String(order._id || order.id || "");
  // Matches the frontend Profile page format (last 6 characters uppercase)
  return id.slice(-6).toUpperCase();
};

// ─── Shared email wrapper (Brevo REST API) ────────────────────────────────────
const sendEmail = async ({ subject, htmlContent, toEmail, toName }) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn("[EmailService] BREVO_API_KEY not set - skipping email send.");
    return;
  }

  // Load dynamically to avoid ES module import hoisting issues with dotenv
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@iftchennai.com";
  const SENDER_NAME  = process.env.BREVO_SENDER_NAME  || "IFT Chennai";

  const payload = {
    sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
    to:          [{ email: toEmail || SENDER_EMAIL, name: toName || SENDER_NAME }],
    subject,
    htmlContent,
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept":       "application/json",
        "content-type": "application/json",
        "api-key":      process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[EmailService] Brevo API error:", data);
    } else {
      console.log(`[EmailService] Email sent - Subject: "${subject}" | MessageId: ${data.messageId}`);
    }
    return data;
  } catch (err) {
    console.error("[EmailService] Failed to send email:", err.message);
  }
};

// ─── Shared HTML shell ────────────────────────────────────────────────────────
const buildEmailShell = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IFT Chennai - Order Notification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #333; font-size: 14px; }
    .email-wrap { max-width: 600px; margin: 24px auto; background: #fff; border: 1px solid #ddd; }
    .logo-header { padding: 20px 30px; text-align: center; background: #fff; border-bottom: 1px solid #eee; }
    .logo-header img { height: 130px; width: auto; max-width: 100%; }
    .logo-header .brand-name { font-size: 18px; font-weight: 700; color: #2d3184; margin-top: 6px; }
    .logo-header .brand-sub  { font-size: 12px; color: #777; }
    .order-banner { background: #3d4799; color: #fff; padding: 18px 30px; }
    .order-banner h2 { font-size: 20px; font-weight: 700; margin: 0; }
    .body { padding: 24px 30px; }
    .intro { font-size: 13px; color: #555; margin-bottom: 16px; line-height: 1.5; }
    .order-link { color: #2d3184; font-weight: 600; }
    table.items-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    table.items-table th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-weight: 600; color: #444; }
    table.items-table td { border: 1px solid #e5e5e5; padding: 8px 10px; color: #333; vertical-align: top; }
    table.items-table .qty-col   { text-align: center; width: 80px; }
    table.items-table .price-col { text-align: right;  width: 90px; }
    table.items-table .summary-label { font-weight: 600; text-align: right; color: #444; background: #fafafa; }
    table.items-table .summary-value { text-align: right; font-weight: 600; }
    table.items-table .total-label   { font-weight: 700; text-align: right; color: #2d3184; background: #f0f2ff; }
    table.items-table .total-value   { font-weight: 700; text-align: right; color: #2d3184; background: #f0f2ff; }
    .billing-heading { color: #2d3184; font-size: 16px; font-weight: 700; margin: 24px 0 10px 0; }
    .billing-box { border: 1px solid #ddd; padding: 14px 16px; font-size: 13px; color: #444; line-height: 1.9; }
    .billing-box a { color: #2d3184; text-decoration: none; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .badge-paid       { background: #d1fae5; color: #065f46; }
    .badge-pending    { background: #fef3c7; color: #92400e; }
    .badge-shipped    { background: #dbeafe; color: #1e40af; }
    .badge-delivered  { background: #ede9fe; color: #5b21b6; }
    .badge-cancelled  { background: #fee2e2; color: #991b1b; }
    .badge-processing { background: #e0f2fe; color: #075985; }
    .badge-completed  { background: #d1fae5; color: #065f46; }
    .status-transition { display: flex; align-items: center; gap: 10px; margin: 8px 0 16px 0; }
    .footer { border-top: 1px solid #eee; padding: 16px 30px; font-size: 12px; color: #777; line-height: 1.7; text-align: center; }
    .footer a { color: #2d3184; text-decoration: none; }
    .congrats { font-size: 13px; color: #555; margin: 20px 0 4px 0; }
  </style>
</head>
<body>
  <div class="email-wrap">
    <div class="logo-header">
      <div class="brand-name">AS Grocery</div>
      <div class="brand-sub">Online Grocery Store</div>
    </div>
    ${bodyContent}
    <div class="footer">
      <p>AS Grocery — Online Grocery Store</p>
    </div>
  </div>
</body>
</html>`;

// ─── Payment / New Order Email ────────────────────────────────────────────────

const formatAddressContent = (addr = {}) => {
  if (!addr || typeof addr !== "object") return "";
  const name = `${addr.firstName || ""} ${addr.lastName || ""}`.trim();
  const company = addr.companyName || addr.company || "";
  const street1 = addr.streetAddress1 || addr.address1 || "";
  const street2 = addr.streetAddress2 || addr.address2 || "";
  const city = addr.city || "";
  const state = addr.state || "";
  const pinCode = addr.pinCode || addr.pincode || addr.pin_code || "";
  const country = addr.country || "India";
  const phone = addr.phone || "";
  const email = addr.email || "";

  if (!name && !street1 && !city && !pinCode && !phone && !email) return "";

  const lines = [];
  if (company) lines.push(`<strong>${company}</strong>`);
  if (name) lines.push(name);
  if (street1) lines.push(street1);
  if (street2) lines.push(street2);

  let cityStatePin = "";
  if (city) cityStatePin += city;
  if (state) cityStatePin += (cityStatePin ? `, ${state}` : state);
  if (pinCode) cityStatePin += (cityStatePin ? ` - ${pinCode}` : "");
  if (cityStatePin) lines.push(cityStatePin);

  if (country) lines.push(country);

  if (phone) lines.push(`<a href="tel:${phone}">${phone}</a>`);
  if (email) lines.push(`<a href="mailto:${email}">${email}</a>`);

  return lines.join("<br/>");
};

const renderOrderAddresses = (order) => {
  const billing = order.billingDetails || {};
  let shipping = order.shippingDetails || {};

  const billingHTML = formatAddressContent(billing);

  const hasShippingDetails =
    shipping &&
    (shipping.streetAddress1 || shipping.firstName || shipping.city || shipping.pinCode || shipping.pincode);

  let shippingHTML = "";
  if (hasShippingDetails) {
    shippingHTML = formatAddressContent(shipping);
  } else if (order.shippingAddress) {
    shippingHTML = order.shippingAddress;
  } else {
    shippingHTML = billingHTML;
  }

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; border-collapse: separate;">
      <tr>
        <td width="48%" valign="top" style="vertical-align: top; width: 48%;">
          <h3 class="billing-heading" style="margin-top: 0; margin-bottom: 8px;">Billing Address</h3>
          <div class="billing-box">
            ${billingHTML || "No billing address provided."}
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top" style="vertical-align: top; width: 48%;">
          <h3 class="billing-heading" style="margin-top: 0; margin-bottom: 8px;">Shipping Address</h3>
          <div class="billing-box">
            ${shippingHTML || "No shipping address provided."}
          </div>
        </td>
      </tr>
    </table>`;
};

const getMembershipLabel = (plan) => {
  const p = (plan || "").toLowerCase();
  if (p === "platinum") return "🎖️ Platinum Member (20% off books)";
  if (p === "gold") return "🎖️ Gold Member (15% off books)";
  if (p === "silver") return "🎖️ Silver Member (10% off books)";
  if (p) return `🎖️ ${p.charAt(0).toUpperCase() + p.slice(1)} Member Discount`;
  return "🎖️ Active Member Discount";
};

const renderTableSummaryRows = (order, calcSubtotal) => {
  const subtotal = typeof order.subtotal === "number" && order.subtotal > 0 ? order.subtotal : calcSubtotal;
  const shipping = typeof order.shipping === "number" ? order.shipping : 0;
  const memDiscount = typeof order.membershipDiscount === "number" ? order.membershipDiscount : 0;
  const memPlan = order.membershipPlan || "";

  // Calculate coupon discount amount
  let discount = typeof order.discount === "number" ? order.discount : 0;
  if (discount === 0 && typeof order.total === "number") {
    const expectedTotalBeforeCoupon = subtotal + shipping - memDiscount;
    if (expectedTotalBeforeCoupon > order.total) {
      discount = Math.round((expectedTotalBeforeCoupon - order.total) * 100) / 100;
    }
  }

  const couponCode = (order.couponCode || "").trim().toUpperCase();

  let rows = `<tr><td class="summary-label" colspan="2">Subtotal:</td><td class="summary-value">${formatCurrency(subtotal)}</td></tr>`;

  // Coupon / Discount row
  if (couponCode || discount > 0) {
    const couponLabel = couponCode ? `Coupon (${couponCode}):` : `Discount:`;
    const discountVal = discount > 0 ? `-${formatCurrency(discount)}` : `Applied`;
    rows += `<tr><td class="summary-label" colspan="2" style="color: #16a34a; font-weight: 600;">${couponLabel}</td><td class="summary-value" style="color: #16a34a; font-weight: 600;">${discountVal}</td></tr>`;
  }

  // Active Membership Discount row
  if (memDiscount > 0 || memPlan) {
    const memLabel = getMembershipLabel(memPlan);
    const memVal = memDiscount > 0 ? `-${formatCurrency(memDiscount)}` : `Applied`;
    rows += `<tr><td class="summary-label" colspan="2" style="color: #d97706; font-weight: 600;">${memLabel}:</td><td class="summary-value" style="color: #d97706; font-weight: 600;">${memVal}</td></tr>`;
  }

  // Shipping row
  if (shipping > 0) {
    rows += `<tr><td class="summary-label" colspan="2">Shipping:</td><td class="summary-value">${formatCurrency(shipping)}</td></tr>`;
  } else if (order.shippingAddress !== "Digital Delivery") {
    rows += `<tr><td class="summary-label" colspan="2">Shipping:</td><td class="summary-value" style="color: #16a34a; font-weight: 600;">Free Shipping</td></tr>`;
  }

  // Payment method
  if (order.paymentMethod) {
    rows += `<tr><td class="summary-label" colspan="2">Payment method:</td><td class="summary-value">${order.paymentMethod}</td></tr>`;
  }

  // Razorpay Transaction ID
  if (order.razorpayPaymentId) {
    rows += `<tr><td class="summary-label" colspan="2">Transaction ID:</td><td class="summary-value" style="font-size: 12px;">${order.razorpayPaymentId}</td></tr>`;
  }

  // Tracking Number
  if (order.trackingNumber) {
    rows += `<tr><td class="summary-label" colspan="2">Tracking Number:</td><td class="summary-value">${order.trackingNumber}</td></tr>`;
  }

  // Total
  rows += `<tr><td class="total-label" colspan="2">Total:</td><td class="total-value">${formatCurrency(order.total)}</td></tr>`;

  return rows;
};

/**
 * Send admin email notification when a payment is received.
 * @param {Object} order - The saved order document
 */
export const sendPaymentNotificationToAdmin = async (order) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const items        = order.items || [];
  const orderNum     = getOrderNumber(order);
  const orderDate    = formatDateShort(order.createdAt || new Date());

  const getPrice = (item) => Number(item.price || item.product?.discountPrice || item.product?.price || item.product?.originalPrice || 0);

  const itemsRows = items.map((item) => `
    <tr>
      <td>${item.product?.name || item.name || "Product"}</td>
      <td class="qty-col">${item.quantity || 1}</td>
      <td class="price-col">${formatCurrency(getPrice(item))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;padding:12px;">No items</td></tr>`;

  const subtotal = items.reduce((sum, i) => sum + (getPrice(i) * (i.quantity || 1)), 0);

  const body = `
    <div class="order-banner"><h2>New Order: #${orderNum}</h2></div>
    <div class="body">
      <p class="intro">
        You've received the following order from <strong>${customerName}</strong>:<br/>
        <span class="order-link">[Order #${orderNum}]</span> (${orderDate})
      </p>
      <table class="items-table">
        <thead><tr><th>Product</th><th class="qty-col">Quantity</th><th class="price-col">Price</th></tr></thead>
        <tbody>
          ${itemsRows}
          ${renderTableSummaryRows(order, subtotal)}
        </tbody>
      </table>
      ${renderOrderAddresses(order)}
      <p class="congrats">Congratulations on the sale.<br/>Process your orders on the go.</p>
    </div>`;

  await sendEmail({
    subject: `[IFT] New Order #${orderNum} from ${customerName} - ${formatCurrency(order.total)}`,
    htmlContent: buildEmailShell(body),
  });
};

// ─── Order Status Update Email ────────────────────────────────────────────────

/**
 * Send admin email notification when an order status changes.
 * @param {Object} order     - The updated order document
 * @param {string} oldStatus - Previous status before the change
 */
export const sendOrderStatusUpdateToAdmin = async (order, oldStatus) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const newStatus    = order.status || "updated";
  const orderNum     = getOrderNumber(order);
  const orderDate    = formatDateShort(order.createdAt || new Date());
  const items        = order.items || [];

  const getPrice = (item) => Number(item.price || item.product?.discountPrice || item.product?.price || item.product?.originalPrice || 0);

  const itemsRows = items.map((item) => `
    <tr>
      <td>${item.product?.name || item.name || "Product"}</td>
      <td class="qty-col">${item.quantity || 1}</td>
      <td class="price-col">${formatCurrency(getPrice(item))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;padding:12px;">No items</td></tr>`;

  const subtotal = items.reduce((sum, i) => sum + (getPrice(i) * (i.quantity || 1)), 0);

  const body = `
    <div class="order-banner"><h2>Order Update: #${orderNum}</h2></div>
    <div class="body">
      <p class="intro">
        Order from <strong>${customerName}</strong> has been updated:<br/>
        <span class="order-link">[Order #${orderNum}]</span> (${orderDate})
      </p>
      <div style="margin:12px 0 16px 0;">
        <strong>Status Change:</strong><br/>
        <div class="status-transition">
          <span class="badge badge-${(oldStatus || "pending").toLowerCase()}">${(oldStatus || "pending").toUpperCase()}</span>
          <span style="font-size:16px;color:#888;">&#8594;</span>
          <span class="badge badge-${newStatus.toLowerCase()}">${newStatus.toUpperCase()}</span>
        </div>
      </div>
      <table class="items-table">
        <thead><tr><th>Product</th><th class="qty-col">Quantity</th><th class="price-col">Price</th></tr></thead>
        <tbody>
          ${itemsRows}
          ${renderTableSummaryRows(order, subtotal)}
        </tbody>
      </table>
      ${renderOrderAddresses(order)}
      <p class="congrats">Process your orders on the go.</p>
    </div>`;

  await sendEmail({
    subject: `[IFT] Order #${orderNum} Status: ${(oldStatus || "").toUpperCase()} → ${newStatus.toUpperCase()} | ${customerName}`,
    htmlContent: buildEmailShell(body),
  });
};

// ─── Customer Emails ─────────────────────────────────────────────────────────

export const sendPaymentSuccessToCustomer = async (order) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const customerEmail = billing.email;
  const orderNum     = getOrderNumber(order);
  const items        = order.items || [];
  
  const getPrice = (item) => Number(item.price || item.product?.discountPrice || item.product?.price || item.product?.originalPrice || 0);

  const itemsRows = items.map((item) => `
    <tr>
      <td>${item.product?.name || item.name || "Product"}</td>
      <td class="qty-col">${item.quantity || 1}</td>
      <td class="price-col">${formatCurrency(getPrice(item))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;padding:12px;">No items</td></tr>`;

  const subtotal = items.reduce((sum, i) => sum + (getPrice(i) * (i.quantity || 1)), 0);

  const body = `
    <div class="order-banner"><h2>Payment Successful: Order #${orderNum}</h2></div>
    <div class="body">
      <p class="intro">
        Dear <strong>${customerName}</strong>,<br/><br/>
        Thank you for your purchase! Your payment was successful and we are now processing your order.
      </p>
      <table class="items-table">
        <thead><tr><th>Product</th><th class="qty-col">Quantity</th><th class="price-col">Price</th></tr></thead>
        <tbody>
          ${itemsRows}
          ${renderTableSummaryRows(order, subtotal)}
        </tbody>
      </table>
      ${renderOrderAddresses(order)}
      <p class="congrats" style="margin-top:20px;">Thank you for shopping with us!</p>
    </div>`;

  if (customerEmail) {
    await sendEmail({
      toEmail: customerEmail,
      toName: customerName,
      subject: `[IFT] Payment Successful - Order #${orderNum}`,
      htmlContent: buildEmailShell(body),
    });
  }
};

export const sendPaymentFailedToCustomer = async (order) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const customerEmail = billing.email;
  const orderNum     = getOrderNumber(order);
  
  const body = `
    <div class="order-banner" style="background: #dc2626;"><h2>Payment Failed: Order #${orderNum}</h2></div>
    <div class="body">
      <p class="intro">
        Dear <strong>${customerName}</strong>,<br/><br/>
        We noticed that your recent payment attempt for Order #${orderNum} has failed. 
        Please try again or use a different payment method.
      </p>
      <p class="intro">If you have any questions, please contact our support team.</p>
    </div>`;

  if (customerEmail) {
    await sendEmail({
      toEmail: customerEmail,
      toName: customerName,
      subject: `[IFT] Payment Failed - Order #${orderNum}`,
      htmlContent: buildEmailShell(body),
    });
  }
};

export const sendTrackingUpdateToCustomer = async (order) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const customerEmail = billing.email;
  const orderNum     = getOrderNumber(order);
  const trackingNumber = order.trackingNumber;
  const items        = order.items || [];
  
  const getPrice = (item) => Number(item.price || item.product?.discountPrice || item.product?.price || item.product?.originalPrice || 0);

  const itemsRows = items.map((item) => `
    <tr>
      <td>${item.product?.name || item.name || "Product"}</td>
      <td class="qty-col">${item.quantity || 1}</td>
      <td class="price-col">${formatCurrency(getPrice(item))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;padding:12px;">No items</td></tr>`;

  const subtotal = items.reduce((sum, i) => sum + (getPrice(i) * (i.quantity || 1)), 0);
  
  const body = `
    <div class="order-banner"><h2>Tracking Update: Order #${orderNum}</h2></div>
    <div class="body">
      <p class="intro">
        Dear <strong>${customerName}</strong>,<br/><br/>
        Good news! Your order has been dispatched. Your tracking number is <strong>${trackingNumber}</strong>.
      </p>
      <p class="intro">
        You can track your shipment here: <a href="https://www.tpcglobe.com/" target="_blank" style="color: #2d3184; font-weight: 600;">Track your order (www.tpcglobe.com)</a>
      </p>
      <h3 class="billing-heading" style="margin-top: 20px;">Shipped Items</h3>
      <table class="items-table">
        <thead><tr><th>Product</th><th class="qty-col">Quantity</th><th class="price-col">Price</th></tr></thead>
        <tbody>
          ${itemsRows}
          ${renderTableSummaryRows(order, subtotal)}
        </tbody>
      </table>
      ${renderOrderAddresses(order)}
      <p class="congrats" style="margin-top: 20px;">Thank you for shopping with us!</p>
    </div>`;

  if (customerEmail) {
    await sendEmail({
      toEmail: customerEmail,
      toName: customerName,
      subject: `[IFT] Order Dispatched - Tracking Update for Order #${orderNum}`,
      htmlContent: buildEmailShell(body),
    });
  }
};

/**
 * Send admin email notification when an international (out of India) order is placed.
 * @param {Object} order - The saved order document
 */
export const sendOutOfIndiaOrderNotificationToAdmin = async (order) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const items        = order.items || [];
  const orderNum     = getOrderNumber(order);
  const orderDate    = formatDateShort(order.createdAt || new Date());

  const getPrice = (item) => Number(item.price || item.product?.discountPrice || item.product?.price || item.product?.originalPrice || 0);

  const itemsRows = items.map((item) => `
    <tr>
      <td>${item.product?.name || item.name || "Product"}</td>
      <td class="qty-col">${item.quantity || 1}</td>
      <td class="price-col">${formatCurrency(getPrice(item))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;padding:12px;">No items</td></tr>`;

  const subtotal = items.reduce((sum, i) => sum + (getPrice(i) * (i.quantity || 1)), 0);

  const body = `
    <div class="order-banner" style="background: #e65100;">
      <h2>International Order Placed: #${orderNum}</h2>
    </div>
    <div class="body">
      <div style="background-color: #fff8e1; border: 1px solid #ffe082; padding: 15px; margin-bottom: 20px; border-radius: 4px; color: #b78103; font-size: 13px; line-height: 1.5;">
        <strong>⚠️ Out of India Order - Action Required:</strong><br/>
        This order was placed from outside of India (${billing.country || 'International'}). 
        No payment has been collected online. The IFT Chennai team needs to contact this customer within 7 days to finalize delivery charge estimation and payment options.
      </div>
      <p class="intro">
        You've received the following order from <strong>${customerName}</strong>:<br/>
        <span class="order-link">[Order #${orderNum}]</span> (${orderDate})
      </p>
      <table class="items-table">
        <thead><tr><th>Product</th><th class="qty-col">Quantity</th><th class="price-col">Price</th></tr></thead>
        <tbody>
          ${itemsRows}
          ${renderTableSummaryRows(order, subtotal)}
        </tbody>
      </table>
      ${renderOrderAddresses(order)}
      <p class="congrats">Please contact the customer promptly to process this order.</p>
    </div>`;

  await sendEmail({
    subject: `[IFT] [OUT OF INDIA] New Order #${orderNum} from ${customerName} - Pending Contact`,
    htmlContent: buildEmailShell(body),
  });
};

/**
 * Send customer email notification when an international (out of India) order is placed.
 * @param {Object} order - The saved order document
 */
export const sendOutOfIndiaOrderNotificationToCustomer = async (order) => {
  const billing      = order.billingDetails || {};
  const customerName = `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || "Customer";
  const customerEmail = billing.email;
  const orderNum     = getOrderNumber(order);
  const items        = order.items || [];

  const getPrice = (item) => Number(item.price || item.product?.discountPrice || item.product?.price || item.product?.originalPrice || 0);

  const itemsRows = items.map((item) => `
    <tr>
      <td>${item.product?.name || item.name || "Product"}</td>
      <td class="qty-col">${item.quantity || 1}</td>
      <td class="price-col">${formatCurrency(getPrice(item))}</td>
    </tr>`
  ).join("") || `<tr><td colspan="3" style="text-align:center;color:#999;padding:12px;">No items</td></tr>`;

  const subtotal = items.reduce((sum, i) => sum + (getPrice(i) * (i.quantity || 1)), 0);

  const body = `
    <div class="order-banner" style="background: #2d3184;">
      <h2>Order Placed: #${orderNum}</h2>
    </div>
    <div class="body">
      <p class="intro">
        Dear <strong>${customerName}</strong>,<br/><br/>
        Thank you for placing your order with Islamic Foundation Trust (IFT).
      </p>
      <div style="background-color: #f0f2ff; border: 1px solid #cdd3ff; padding: 15px; margin-bottom: 20px; border-radius: 4px; color: #2d3184; font-size: 13px; line-height: 1.5;">
        <strong>🌍 International Order (Out of India):</strong><br/>
        Since your delivery address is outside of India, your order has been placed successfully without online payment. 
        Our IFT Chennai team will contact you at <strong>${billing.email}</strong> or <strong>${billing.phone}</strong> in <strong>7 days</strong> to estimate international shipping charges and assist you with manual payment options.
      </div>
      <table class="items-table">
        <thead><tr><th>Product</th><th class="qty-col">Quantity</th><th class="price-col">Price</th></tr></thead>
        <tbody>
          ${itemsRows}
          ${renderTableSummaryRows(order, subtotal)}
        </tbody>
      </table>
      ${renderOrderAddresses(order)}
      <p class="congrats">Thank you for your patience and for choosing Islamic Foundation Trust.</p>
    </div>`;

  if (customerEmail) {
    await sendEmail({
      toEmail: customerEmail,
      toName: customerName,
      subject: `[IFT] Order Placed - Order #${orderNum} (Pending Shipping Estimation)`,
      htmlContent: buildEmailShell(body),
    });
  }
};

/**
 * Send email notification to admin about a new enquiry.
 */
export const sendEnquiryNotificationToAdmin = async (enquiry) => {
  const { name, email, whatsapp, message, enquiryNumber } = enquiry;
  const adminEmail = process.env.BREVO_SENDER_EMAIL || "iftchennai26@gmail.com";
  const formattedDate = formatDateShort(enquiry.createdAt || new Date());
  const enqNum = enquiryNumber || "N/A";

  const body = `
    <div class="order-banner" style="background: #2d3184;">
      <h2>New Enquiry: #${enqNum}</h2>
    </div>
    <div class="body">
      <p class="intro">You have received a new customer enquiry from the website. Here are the details:</p>
      <table class="items-table">
        <tbody>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">Enquiry Number:</td><td style="font-weight: bold; color: #2d3184;">#${enqNum}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">Name:</td><td>${name || "Not specified"}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">WhatsApp:</td><td><a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" target="_blank">${whatsapp}</a></td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">Submitted On:</td><td>${formattedDate}</td></tr>
        </tbody>
      </table>
      <h3 class="billing-heading">Enquiry Message:</h3>
      <div class="billing-box" style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">
        ${message}
      </div>
    </div>
  `;

  await sendEmail({
    toEmail: adminEmail,
    toName: "IFT Admin",
    subject: `[IFT Enquiry #${enqNum}] New enquiry from ${name || email}`,
    htmlContent: buildEmailShell(body)
  });
};

/**
 * Send confirmation copy of the enquiry to the customer.
 */
export const sendEnquiryAcknowledgementToCustomer = async (enquiry) => {
  const { name, email, whatsapp, message, enquiryNumber } = enquiry;
  const formattedDate = formatDateShort(enquiry.createdAt || new Date());
  const enqNum = enquiryNumber || "N/A";

  const body = `
    <div class="order-banner" style="background: #0f5132;">
      <h2>We Received Your Enquiry</h2>
    </div>
    <div class="body">
      <p class="intro">
        Dear <strong>${name || "Customer"}</strong>,<br/><br/>
        Thank you for contacting Islamic Foundation Trust (IFT) Chennai. We have received your enquiry submitted on ${formattedDate}.
      </p>
      <h3 class="billing-heading">Details Submitted:</h3>
      <table class="items-table">
        <tbody>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">Enquiry Number:</td><td style="font-weight: bold; color: #0f5132;">#${enqNum}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">Email Address:</td><td>${email}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 150px;">WhatsApp Number:</td><td>${whatsapp}</td></tr>
        </tbody>
      </table>
      <h3 class="billing-heading">Your Message:</h3>
      <div class="billing-box" style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">
        ${message}
      </div>
      <p class="congrats" style="margin-top: 24px; font-size: 13px; color: #555;">
        If you need urgent assistance, you can call us at <a href="tel:+914426624401">+91-44-26624401</a> or reach out on WhatsApp at <a href="https://wa.me/918668057596">+91 8668057596</a>.
      </p>
    </div>
  `;

  await sendEmail({
    toEmail: email,
    toName: name || "Customer",
    subject: `[IFT] Enquiry Received - Enquiry #${enqNum}`,
    htmlContent: buildEmailShell(body)
  });
};

export const sendMembershipSubscriptionToCustomer = async (membership) => {
  const { userName, userEmail, plan, planName, amount, startDate, endDate, razorpayPaymentId, purchaseId, membershipNumber } = membership;
  const pName = planName || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan' : 'Membership Plan');
  const pId = purchaseId || membershipNumber || 'MS-07001';
  
  const discountText = plan === 'platinum' ? '20% Flat Off on physical books' : plan === 'gold' ? '15% Flat Off on physical books' : '10% Flat Off on physical books';
  
  const startStr = startDate ? formatDateShort(startDate) : formatDateShort(new Date());
  const endStr   = endDate ? formatDateShort(endDate) : '1 Year';

  const body = `
    <div class="order-banner" style="background: #2d3184;">
      <h2>Membership Subscribed: ${pName}</h2>
    </div>
    <div class="body">
      <p class="intro">
        Dear <strong>${userName || "Valued Customer"}</strong>,<br/><br/>
        Congratulations! Your payment of <strong>${formatCurrency(amount)}</strong> was successful and your <strong>${pName}</strong> is now active.
      </p>
      <div style="background-color: #f0f0f8; border: 1px solid #cdd3ff; padding: 15px; margin-bottom: 20px; border-radius: 4px; color: #2d3184; font-size: 13px; line-height: 1.5;">
        <strong>🎉 Active Membership Discount Benefit:</strong><br/>
        You now get <strong>${discountText}</strong> automatically applied to your cart whenever you log in and shop on IFT!
      </div>
      <table class="items-table">
        <tbody>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Order ID:</td><td style="font-weight: bold; color: #2d3184;">#${pId}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Plan Subscribed:</td><td style="font-weight: bold; color: #2d3184;">${pName}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Discount Rate:</td><td style="font-weight: bold; color: #16a34a;">${discountText}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Amount Paid:</td><td>${formatCurrency(amount)}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Start Date:</td><td>${startStr}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Expiry Date:</td><td>${endStr}</td></tr>
          ${razorpayPaymentId ? `<tr><td class="summary-label" style="text-align: left; width: 160px;">Transaction ID:</td><td style="font-size: 12px;">${razorpayPaymentId}</td></tr>` : ''}
        </tbody>
      </table>
      <p class="congrats" style="margin-top: 24px;">Thank you for being a part of Islamic Foundation Trust!</p>
    </div>
  `;

  if (userEmail) {
    await sendEmail({
      toEmail: userEmail,
      toName: userName || "Customer",
      subject: `[IFT] Membership Confirmed (#${pId}) - Welcome to ${pName}!`,
      htmlContent: buildEmailShell(body)
    });
  }
};

/**
 * Send admin email notification when a membership subscription is purchased.
 * @param {Object} membership - The activated Membership document
 */
export const sendMembershipSubscriptionToAdmin = async (membership) => {
  const { userName, userEmail, plan, planName, amount, startDate, endDate, razorpayPaymentId, purchaseId, membershipNumber } = membership;
  const pName = planName || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan' : 'Membership Plan');
  const pId = purchaseId || membershipNumber || 'MS-07001';
  const adminEmail = process.env.BREVO_SENDER_EMAIL || "iftchennai26@gmail.com";

  const startStr = startDate ? formatDateShort(startDate) : formatDateShort(new Date());
  const endStr   = endDate ? formatDateShort(endDate) : '1 Year';

  const body = `
    <div class="order-banner" style="background: #065f46;">
      <h2>New Membership Sale: ${pName}</h2>
    </div>
    <div class="body">
      <p class="intro">
        A customer has successfully purchased a membership subscription. Here are the details:
      </p>
      <table class="items-table">
        <tbody>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Order ID:</td><td style="font-weight: bold; color: #065f46;">#${pId}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Customer Name:</td><td style="font-weight: bold;">${userName || "Customer"}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Customer Email:</td><td><a href="mailto:${userEmail}">${userEmail}</a></td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Plan Subscribed:</td><td style="font-weight: bold; color: #065f46;">${pName}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Amount Paid:</td><td style="font-weight: bold;">${formatCurrency(amount)}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Start Date:</td><td>${startStr}</td></tr>
          <tr><td class="summary-label" style="text-align: left; width: 160px;">Expiry Date:</td><td>${endStr}</td></tr>
          ${razorpayPaymentId ? `<tr><td class="summary-label" style="text-align: left; width: 160px;">Transaction ID:</td><td style="font-size: 12px;">${razorpayPaymentId}</td></tr>` : ''}
        </tbody>
      </table>
      <p class="congrats" style="margin-top: 24px;">You can view and manage memberships in the Admin Dashboard.</p>
    </div>
  `;

  await sendEmail({
    toEmail: adminEmail,
    toName: "IFT Admin",
    subject: `[IFT] New Membership Subscribed (#${pId}) - ${pName} by ${userName || userEmail}`,
    htmlContent: buildEmailShell(body)
  });
};
