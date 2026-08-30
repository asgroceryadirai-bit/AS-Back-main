import crypto from "crypto";
import Admin from "../models/Admin.js";

// ─── Utility: hash a plain-text password with SHA-256 ─────────────────────────
function hashPassword(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

const DEFAULT_ADMIN_PASSWORDS = [
  "adminAS",
  "admin123",
  "admin",
  "admin@123",
  "Admin@123",
  "OrderAdmin@2026",
  "NewsAdmin@2026"
];

// ─── POST /api/admin/login ─────────────────────────────────────────────────────
// Body: { adminType?: "admin" | "orders" | "catalog" | "news", username: string, password: string }
export async function loginAdmin(req, res) {
  try {
    const { adminType = "admin", username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    const inputHash = hashPassword(cleanPassword);

    // 1. Direct standard admin login verification
    const isStandardAdminUser = ["admin", "storeadmin", "superadmin"].includes(cleanUsername);
    const isStandardAdminPass = DEFAULT_ADMIN_PASSWORDS.includes(cleanPassword);

    if (isStandardAdminUser && isStandardAdminPass) {
      try {
        await Admin.updateOne(
          { role: "admin" },
          { $set: { username: "admin", passwordHash: inputHash } },
          { upsert: true }
        );
      } catch (e) {
        console.warn("Could not sync admin to db:", e.message);
      }
      return res.json({ success: true, role: "admin" });
    }

    // 2. Database lookup
    let admin = await Admin.findOne({
      $or: [
        { username: new RegExp(`^${cleanUsername}$`, "i") },
        { role: cleanUsername }
      ]
    });

    // If not found, try by requested adminType
    if (!admin && adminType) {
      admin = await Admin.findOne({ role: adminType });
    }

    if (admin) {
      if (inputHash === admin.passwordHash || (isStandardAdminUser && isStandardAdminPass)) {
        const returnRole = ["catalog", "orders", "admin", "superadmin"].includes(admin.role) ? "admin" : admin.role;
        return res.json({ success: true, role: returnRole });
      }
    }

    // 3. Fallback for role-specific accounts (orderadmin / newsadmin)
    if (cleanUsername === "orderadmin" && (cleanPassword === "OrderAdmin@2026" || cleanPassword === "adminAS" || cleanPassword === "admin123")) {
      return res.json({ success: true, role: "orders" });
    }
    if (cleanUsername === "newsadmin" && (cleanPassword === "NewsAdmin@2026" || cleanPassword === "adminAS" || cleanPassword === "admin123")) {
      return res.json({ success: true, role: "news" });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials. Please check your admin username and password." });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    return res.status(500).json({ success: false, message: "Server error during authentication." });
  }
}

// ─── POST /api/admin/seed ──────────────────────────────────────────────────────
// Inserts the default admin accounts into MongoDB (idempotent — skips if already seeded).
export async function seedAdmins(req, res) {
  try {
    const defaultAdmins = [
      { role: "admin",   username: "admin",      passwordHash: hashPassword("adminAS") },
      { role: "orders",  username: "orderadmin", passwordHash: hashPassword("OrderAdmin@2026") },
      { role: "catalog", username: "admin",      passwordHash: hashPassword("adminAS") },
      { role: "news",    username: "newsadmin",  passwordHash: hashPassword("NewsAdmin@2026") },
    ];

    for (const adm of defaultAdmins) {
      await Admin.updateOne(
        { role: adm.role },
        { $set: { username: adm.username, passwordHash: adm.passwordHash } },
        { upsert: true }
      );
    }

    console.log("✅ Admin accounts seeded/updated successfully in MongoDB.");
    if (res) {
      return res.json({ success: true, message: "Admin accounts seeded/updated successfully in MongoDB." });
    }
  } catch (err) {
    console.error("❌ Admin seed error:", err);
    if (res) {
      return res.status(500).json({ success: false, message: "Server error during seeding." });
    }
  }
}
