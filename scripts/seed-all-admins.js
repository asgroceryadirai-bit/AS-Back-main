import dns from "dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";
import Admin from "../models/Admin.js";

dotenv.config();

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("⚠️ DNS override error:", e?.message);
}

function hashPassword(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

async function main() {
  const uri = process.env.MONGO_URI || "mongodb+srv://riydee_db_user:lgqjzv9QcphzJNSe@asgrocery.l4cexvb.mongodb.net/asgrocery?retryWrites=true&w=majority";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log("✅ Connected to MongoDB Atlas");

    const defaultAdmins = [
      { role: "orders",  username: "orderadmin", passwordHash: hashPassword("OrderAdmin@2026"), plain: "OrderAdmin@2026" },
      { role: "catalog", username: "admin",      passwordHash: hashPassword("adminAS"),         plain: "adminAS" },
      { role: "news",    username: "newsadmin",  passwordHash: hashPassword("NewsAdmin@2026"),  plain: "NewsAdmin@2026" },
    ];

    for (const adm of defaultAdmins) {
      const res = await Admin.updateOne(
        { role: adm.role },
        {
          $set: {
            username: adm.username,
            passwordHash: adm.passwordHash,
          },
        },
        { upsert: true }
      );
      console.log(`✅ Upserted Admin [${adm.role}]: username="${adm.username}", password="${adm.plain}" (matched: ${res.matchedCount}, modified: ${res.modifiedCount}, upsertedId: ${res.upsertedId})`);
    }

    const allAdmins = await Admin.find().lean();
    console.log("📋 Current Admin Accounts in Database:", allAdmins.map(a => ({ role: a.role, username: a.username })));

  } catch (err) {
    console.error("❌ Error seeding Admin accounts:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
