import crypto from "crypto";
import Admin from "../models/Admin.js";

// ─── Utility: hash a plain-text password with SHA-256 ─────────────────────────
function hashPassword(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

// ─── POST /api/admin/login ─────────────────────────────────────────────────────
// Body: { adminType: "orders" | "catalog" | "news", username: string, password: string }
export async function loginAdmin(req, res) {
  try {
    const { adminType, username, password } = req.body;

    if (!adminType || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const admin = await Admin.findOne({ role: adminType, username: username.trim() });

    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials for the selected admin role." });
    }

    const inputHash = hashPassword(password.trim());
    if (inputHash !== admin.passwordHash) {
      return res.status(401).json({ success: false, message: "Invalid credentials for the selected admin role." });
    }

    return res.json({ success: true, role: admin.role });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    return res.status(500).json({ success: false, message: "Server error during authentication." });
  }
}

// ─── POST /api/admin/seed ──────────────────────────────────────────────────────
// Inserts the 3 default admin accounts into MongoDB (idempotent — skips if already seeded).
export async function seedAdmins(req, res) {
  try {
    const defaultAdmins = [
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
    return res.json({ success: true, message: "Admin accounts seeded/updated successfully in MongoDB." });
  } catch (err) {
    console.error("❌ Admin seed error:", err);
    return res.status(500).json({ success: false, message: "Server error during seeding." });
  }
}
