import dns from "dns";
import mongoose from "mongoose";

// Force Google Public DNS so MongoDB Atlas SRV records resolve correctly
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  console.log("✅ DNS set to Google Public DNS (8.8.8.8 / 8.8.4.4)");
} catch (e) {
  console.warn("⚠️ Could not override DNS servers:", e);
}

mongoose.set("bufferCommands", false);

export async function connectToMongoDB() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️ No MONGO_URI found in environment variables. Falling back to default Atlas connection string.");
    uri = "mongodb+srv://riydee_db_user:lgqjzv9QcphzJNSe@asgrocery.l4cexvb.mongodb.net/asgrocery?retryWrites=true&w=majority";
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
  };

  try {
    await mongoose.connect(uri, options);
    console.log("✅ Connected to MongoDB Atlas successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err?.message || err);

    if (err?.message?.includes("bad auth") || err?.code === 8000) {
      console.error("💡 Authentication failed! Check the username ('riydee_db_user') and password in your MongoDB Atlas cluster or MONGO_URI in .env.");
    } else {
      console.warn("⚠️ Continuing without database. Check Atlas IP whitelist: https://cloud.mongodb.com");
    }
  }
}
