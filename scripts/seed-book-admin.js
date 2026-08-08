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

    const result = await Admin.updateOne(
      { role: "catalog" },
      {
        $set: {
          username: "admin",
          passwordHash: hashPassword("adminAS"),
        },
      },
      { upsert: true }
    );

    console.log("✅ Book Admin user upserted into database:");
    console.log({
      role: "catalog",
      username: "admin",
      password: "adminAS",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId,
    });
  } catch (err) {
    console.error("❌ Error seeding Book Admin user:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
