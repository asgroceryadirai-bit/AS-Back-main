import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import { Order } from "./models/Order.js";
import { Membership } from "./models/Membership.js";
import { PaymentLog } from "./models/PaymentLog.js";
import { ShippingConfig } from "./models/ShippingConfig.js";
import { connectToMongoDB } from "./config/db.js";
import mongoose from "mongoose";

import bookRouter from "./routes/books.js";
import audioBookRouter from "./routes/audiobooks.js";
import eBookRouter from "./routes/ebooks.js";
import ePubRouter from "./routes/epubs.js";
import orderRouter from "./routes/orders.js";
import statsRouter from "./routes/stats.js";
import uploadRouter from "./routes/upload.js";
import newsRouter from "./routes/newsRoutes.js";
import booksUploadRouter from "./routes/booksUpload.js";
import audiobooksUploadRouter from "./routes/audiobooksUpload.js";
import adminRouter from "./routes/adminRoutes.js";
import heroBannersRouter from "./routes/heroBanners.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { initSocket } from "./sockets/socketManager.js";
import paymentLogsRouter from "./routes/paymentLogs.js";
import couponsRouter from "./routes/coupons.js";
import enquiryRouter from "./routes/enquiries.js";
import customerRouter from "./routes/customers.js";
import authorsRouter from "./routes/authors.js";
import { findProductForOrderItem } from "./utils/stockUtils.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests dynamically
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Initialize MongoDB Connection
connectToMongoDB();

// Fail-fast Database Middleware
app.use("/api", (req, res, next) => {
  if (
    req.path.startsWith("/health") ||
    req.path.startsWith("/ai") ||
    req.path.startsWith("/razorpay") ||
    req.path.startsWith("/membership") ||
    req.path.startsWith("/quran") ||
    req.path.startsWith("/customers")
  ) {

    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database Connection Error",
      message: "The backend server is unable to connect to MongoDB. " +
        "This is typically due to an IP address whitelisting issue in MongoDB Atlas. " +
        "Please ensure that your current IP address is whitelisted in your MongoDB Atlas console (Network Access tab) to allow your application to connect.",
      details: "Mongoose connection status is: " + mongoose.connection.readyState
    });
  }
  next();
});


// ------------------------------------------------------------------
// Razorpay order creation
// ------------------------------------------------------------------
app.post("/api/razorpay/create-order", async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ success: false, error: "orderId is required" });
  try {
    const dbOrder = await Order.findById(orderId);
    if (!dbOrder) return res.status(404).json({ success: false, error: "Order not found" });

    const amount = Number(dbOrder.total || 0);

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `receipt_${Math.random().toString(36).substring(7)}`,
    };

    const razorOrder = await instance.orders.create(options);

    // Persist razorpay order id to the DB so server can verify later
    try {
      dbOrder.razorpayOrderId = razorOrder.id;
      await dbOrder.save();
    } catch (err) {
      console.warn('Failed to persist razorpayOrderId on order:', err);
    }

    res.json({ success: true, order: razorOrder });
  } catch (error) {
    console.error("Razorpay Error:", error);
    if (error?.statusCode === 401 || String(error).includes("Auth") || String(error?.error?.description).includes("Auth")) {
      console.log("⚠️ Razorpay Auth Failed. Falling back to a simulated mock order for testing.");
      const mockOrder = {
        id: `order_${Math.random().toString(36).substring(2, 16)}`,
        amount: Math.round((await Order.findById(orderId)).total * 100) || 0,
        currency: "INR",
        receipt: `receipt_${Math.random().toString(36).substring(7)}`,
        status: "created"
      };
      return res.json({ success: true, order: mockOrder });
    }
    res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
  }
});

// ------------------------------------------------------------------
// Membership – Create Razorpay order
// ------------------------------------------------------------------
const MEMBERSHIP_PLANS = {
  silver:   { name: 'Silver Plan',   amount: 250,  durationMonths: 12 },
  gold:     { name: 'Gold Plan',     amount: 500,  durationMonths: 12 },
  platinum: { name: 'Platinum Plan', amount: 1000, durationMonths: 12 },
};

const generateMembershipNumber = async () => {
  const now = new Date();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0'); // e.g. '07'
  const prefix = `MS-${monthStr}`;

  const lastDoc = await Membership.findOne({
    membershipNumber: new RegExp(`^${prefix}`)
  }).sort({ createdAt: -1 }).exec();

  let nextNum = 1;
  if (lastDoc && lastDoc.membershipNumber) {
    const match = lastDoc.membershipNumber.match(/\d+$/);
    if (match) {
      nextNum = parseInt(match[0], 10) + 1;
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  return `${prefix}${paddedNum}`;
};

app.post("/api/razorpay/create-membership-order", async (req, res) => {
  const { plan, userId, userName, userEmail } = req.body;
  const planInfo = MEMBERSHIP_PLANS[plan];
  if (!planInfo) return res.status(400).json({ success: false, error: "Invalid plan" });
  if (!userId)   return res.status(400).json({ success: false, error: "userId is required" });

  try {
    const instance = new Razorpay({
      key_id:    process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const mNumber = await generateMembershipNumber();

    // Create a pending membership record first
    const membership = await Membership.create({
      membershipNumber: mNumber,
      purchaseId:       mNumber,
      userId,
      userName:  userName  || '',
      userEmail: userEmail || '',
      plan,
      planName:  planInfo.name,
      amount:    planInfo.amount,
      status:    'pending',
    });

    const razorOrder = await instance.orders.create({
      amount:   planInfo.amount * 100, // paise
      currency: 'INR',
      receipt:  `membership_${membership._id}`,
      notes: { membershipId: membership._id.toString(), plan, userId },
    });

    // Persist razorpay order id
    membership.razorpayOrderId = razorOrder.id;
    await membership.save();

    res.json({
      success:      true,
      order:        razorOrder,
      membershipId: membership._id.toString(),
      planInfo,
    });
  } catch (error) {
    console.error("Membership Razorpay Error:", error);
    res.status(500).json({ success: false, error: "Failed to create membership order" });
  }
});

import { 
  sendMembershipSubscriptionToCustomer, 
  sendMembershipSubscriptionToAdmin 
} from "./services/emailService.js";

// ------------------------------------------------------------------
// Membership – Verify payment & activate
// ------------------------------------------------------------------
import crypto from 'crypto';

app.post("/api/membership/verify", async (req, res) => {
  const { membershipId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  try {
    const membership = await Membership.findById(membershipId);
    if (!membership) return res.status(404).json({ success: false, error: 'Membership not found' });

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      if (expected !== razorpaySignature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
    }

    const planInfo = MEMBERSHIP_PLANS[membership.plan];
    const startDate = new Date();
    const endDate   = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (planInfo?.durationMonths || 12));

    if (!membership.membershipNumber || !membership.purchaseId) {
      const mNumber = await generateMembershipNumber();
      membership.membershipNumber = membership.membershipNumber || mNumber;
      membership.purchaseId       = membership.purchaseId       || mNumber;
    }

    membership.razorpayPaymentId = razorpayPaymentId;
    membership.razorpayOrderId   = razorpayOrderId;
    membership.razorpaySignature = razorpaySignature;
    membership.status    = 'active';
    membership.startDate = startDate;
    membership.endDate   = endDate;
    await membership.save();

    // Trigger membership subscription emails to Customer and Admin
    try {
      await sendMembershipSubscriptionToCustomer(membership);
      await sendMembershipSubscriptionToAdmin(membership);
    } catch (emailErr) {
      console.error('Failed to send membership subscription emails:', emailErr);
    }

    // Persist to PaymentLog
    try {
      const pName = membership.planName || (membership.plan ? `${membership.plan.toUpperCase()} PLAN` : 'MEMBERSHIP PLAN');
      await PaymentLog.create({
        customerName: membership.userName || 'Member',
        customerId: membership.userId || '',
        bookNames: [pName],
        orderId: membership._id.toString(),
        paymentId: razorpayPaymentId || '',
        razorpayOrderId: razorpayOrderId || '',
        paymentStatus: 'Paid',
        amount: membership.amount || 0,
        currency: 'INR',
        paymentMethod: 'Online Payment',
        customerEmail: membership.userEmail || '',
        customerPhone: membership.phone || '',
        notes: `Membership Subscription: ${pName}`,
        source: 'Membership Subscription',
        createdAt: startDate,
        meta: { membershipId: membership._id.toString() }
      });
    } catch (plErr) {
      console.error('Failed to log membership payment:', plErr);
    }

    res.json({ success: true, membership });
  } catch (error) {
    console.error('Membership verify error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify membership payment' });
  }
});

// ------------------------------------------------------------------
// Membership – Get active membership for a user
// ------------------------------------------------------------------
app.get("/api/membership/active/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let membership = await Membership.findOne({
      userId,
      status: 'active',
      endDate: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (membership && (!membership.purchaseId || !membership.membershipNumber)) {
      const mNumber = await generateMembershipNumber();
      membership.membershipNumber = mNumber;
      membership.purchaseId       = mNumber;
      await membership.save();
    }

    res.json({ success: true, membership: membership || null });
  } catch (error) {
    console.error('Fetch active membership error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch membership' });
  }
});

// ------------------------------------------------------------------
// Membership – Get all memberships for a user (history/invoices)
// ------------------------------------------------------------------
app.get("/api/membership/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const memberships = await Membership.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, memberships });
  } catch (error) {
    console.error('Fetch user memberships error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user memberships' });
  }
});

// ------------------------------------------------------------------
// Shipping Rates Configuration
// ------------------------------------------------------------------
app.get("/api/shipping-config", async (req, res) => {
  try {
    let config = await ShippingConfig.findOne();
    if (!config) {
      config = new ShippingConfig();
      await config.save();
    }
    res.json(config);
  } catch (error) {
    console.error("Error fetching shipping config:", error);
    res.status(500).json({ error: "Failed to fetch shipping config" });
  }
});

app.put("/api/shipping-config", async (req, res) => {
  try {
    let config = await ShippingConfig.findOne();
    if (!config) {
      config = new ShippingConfig();
    }
    const { group1, group2, group3 } = req.body;
    if (typeof group1 === 'number') config.group1 = group1;
    if (typeof group2 === 'number') config.group2 = group2;
    if (typeof group3 === 'number') config.group3 = group3;
    
    await config.save();
    res.json(config);
  } catch (error) {
    console.error("Error updating shipping config:", error);
    res.status(500).json({ error: "Failed to update shipping config" });
  }
});

// ------------------------------------------------------------------
// Quran Tamil Translation Proxy Routes (CORS-free via Al Quran Cloud)
// ------------------------------------------------------------------
const quranCache = {
  arabic: {},
  tamil: {}
};

app.post("/api/quran/arabic", async (req, res) => {
  try {
    const { sura, verse } = req.body;
    const suraNum = Number(sura);
    
    // Parse range
    const parts = (verse || "").split("-").map(Number);
    const start = parts[0] || 1;
    const end = parts[1] || start;

    let ayahs = quranCache.arabic[suraNum];
    if (!ayahs) {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${suraNum}/quran-uthmani`);
      if (!response.ok) throw new Error(`Al Quran Cloud returned status ${response.status}`);
      const data = await response.json();
      if (data?.data?.ayahs) {
        ayahs = data.data.ayahs;
        quranCache.arabic[suraNum] = ayahs;
      } else {
        throw new Error("Invalid response format from Al Quran Cloud");
      }
    }

    // Filter ayahs within range and format as spans
    const filteredSpans = ayahs
      .filter(ayah => ayah.numberInSurah >= start && ayah.numberInSurah <= end)
      .map(ayah => {
        let text = ayah.text;
        // Strip Bismillah from the first verse of all surahs except Surah 1
        if (suraNum !== 1 && ayah.numberInSurah === 1) {
          const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
          if (text.startsWith(bismillah)) {
            text = text.substring(bismillah.length).trim();
          }
        }
        return `<span>${text}</span>`;
      })
      .join(" ");

    res.setHeader("Content-Type", "text/html");
    res.send(filteredSpans);
  } catch (error) {
    console.error("Arabic Quran fetch error:", error);
    res.status(500).json({ error: "Failed to fetch Arabic Quran content" });
  }
});

app.post("/api/quran/tamil", async (req, res) => {
  try {
    const { sura, verse } = req.body;
    const suraNum = Number(sura);

    // Parse range
    const parts = (verse || "").split("-").map(Number);
    const start = parts[0] || 1;
    const end = parts[1] || start;

    let ayahs = quranCache.tamil[suraNum];
    if (!ayahs) {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${suraNum}/ta.tamil`);
      if (!response.ok) throw new Error(`Al Quran Cloud returned status ${response.status}`);
      const data = await response.json();
      if (data?.data?.ayahs) {
        ayahs = data.data.ayahs;
        quranCache.tamil[suraNum] = ayahs;
      } else {
        throw new Error("Invalid response format from Al Quran Cloud");
      }
    }

    // Filter and format as spans with 'sura:verse' prefix for the frontend parser
    const filteredSpans = ayahs
      .filter(ayah => ayah.numberInSurah >= start && ayah.numberInSurah <= end)
      .map(ayah => `<span>${suraNum}:${ayah.numberInSurah} ${ayah.text}</span>`)
      .join(" ");

    res.setHeader("Content-Type", "text/html");
    res.send(filteredSpans);
  } catch (error) {
    console.error("Tamil Quran fetch error:", error);
    res.status(500).json({ error: "Failed to fetch Tamil Quran content" });
  }
});

app.get("/api/quran/intro/:sura", async (req, res) => {
  // Since the old wordpress/PHP site is no longer active at the domain,
  // return a 404 with a Tamil translation not found placeholder.
  res.status(404).send("<p class='p-6 text-center text-muted-foreground'>முன்னுரை விவரங்கள் கிடைக்கவில்லை.</p>");
});

// Backend API Routes
app.use("/api/books", bookRouter);
app.use("/api/audiobooks", audioBookRouter);
app.use("/api/ebooks", eBookRouter);
app.use("/api/epubs", ePubRouter);
app.use("/api/orders", orderRouter);
app.use("/api/stats", statsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/hero-banners", heroBannersRouter);
// Specific upload routes must come BEFORE the generic /api/upload to avoid prefix matching
app.use("/api/upload/books", booksUploadRouter);
app.use("/api/upload/audiobooks", audiobooksUploadRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/news", newsRouter);
app.use('/api/payment-logs', paymentLogsRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/enquiries', enquiryRouter);
app.use('/api/customers', customerRouter);
app.use('/api/authors', authorsRouter);

// Social Media Share Crawler Endpoint & Route for Dynamic Open Graph Meta Tags
async function handleProductCrawlerShare(req, res) {
  const { id } = req.params;
  try {
    const result = await findProductForOrderItem({ productId: id });
    const product = result?.product;

    const bookTitle = (product?.name || product?.title || "Book Details").replace(/"/g, '&quot;').replace(/\n/g, ' ').trim();
    const authorName = (product?.author || product?.authorName || "").replace(/"/g, '&quot;').replace(/\n/g, ' ').trim();
    
    let rawDesc = product?.description ? String(product.description).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim() : "";
    if (rawDesc.length > 200) {
      rawDesc = rawDesc.slice(0, 197) + '...';
    }
    const descriptionText = rawDesc || "Authentic publication by Islamic Foundation Trust (IFT) Chennai. Pioneer in publishing authentic Islamic translations and literature since 1973.";
    
    const imageUrl = product?.imageUrl || product?.image || product?.coverImage || "https://iftchennai.in/favicon.ico";
    const host = req.headers.host || 'iftchennai.in';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const targetUrl = host.includes('localhost') ? `http://${host}/product/${id}` : `https://iftchennai.in/product/${id}`;
    const pageTitle = authorName ? `${bookTitle} by ${authorName} | IFT Chennai` : `${bookTitle} | IFT Chennai`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <meta name="description" content="${descriptionText}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${descriptionText}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:alt" content="${bookTitle}">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="IFT Chennai">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${descriptionText}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <script>window.location.replace("${targetUrl}");</script>
</head>
<body>
  <h1>${bookTitle}</h1>
  ${authorName ? `<h3>By ${authorName}</h3>` : ''}
  <p>${descriptionText}</p>
  <img src="${imageUrl}" alt="${bookTitle}">
  <a href="${targetUrl}">Click here to view book details on IFT Chennai</a>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error("Error generating share meta:", error);
    return res.redirect(`https://iftchennai.in/product/${id}`);
  }
}

app.get("/product/:id", async (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  const isCrawler = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot|bot|crawler|spider/i.test(userAgent);
  if (isCrawler) {
    return handleProductCrawlerShare(req, res);
  }
  next();
});

app.get("/api/share/product/:id", handleProductCrawlerShare);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API server is healthy and running." });
});

// Global Error Handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});


// Initialize Socket.io Manager (fails gracefully if dependencies are missing)
initSocket(server);

