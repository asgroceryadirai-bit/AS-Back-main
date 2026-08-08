import dns from "dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import HeroBanner from "../models/HeroBanner.js";

dotenv.config();

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("⚠️ DNS override error:", e?.message);
}

async function main() {
  const uri = process.env.MONGO_URI || "mongodb+srv://riydee_db_user:lgqjzv9QcphzJNSe@asgrocery.l4cexvb.mongodb.net/asgrocery?retryWrites=true&w=majority";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log("✅ Connected to MongoDB Atlas");

    const existingCount = await HeroBanner.countDocuments();
    console.log(`Current hero banners count: ${existingCount}`);

    // If no hero banners or existing banners need photo/heading/subheading updates
    const sampleBanners = [
      {
        imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80",
        heading: "Organic Fresh Farm Harvest",
        subheading: "Handpicked daily fresh fruits, leafy vegetables & farm dairy with up to 30% discount.",
        buttonText: "Shop Fresh Produce",
        link: "/categories",
        order: 0,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
        heading: "Essential Pantry & Daily Staples",
        subheading: "Premium rice, whole grains, cold-pressed cooking oils, and spices delivered in 30 minutes.",
        buttonText: "Explore Pantry",
        link: "/categories",
        order: 1,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
        heading: "Artisanal Breads & Dairy Delights",
        subheading: "Oven-fresh bakery items, wholesome whole-wheat loaves, pure milk, and farm cheeses.",
        buttonText: "Order Bakery",
        link: "/categories",
        order: 2,
      },
    ];

    await HeroBanner.deleteMany({});
    await HeroBanner.insertMany(sampleBanners);
    console.log(`✅ Seeded ${sampleBanners.length} rich sample hero banners with Photo, Heading, Subheading into MongoDB Atlas!`);

    const allBanners = await HeroBanner.find().lean();
    console.log("Current Banners in DB:", allBanners.map(b => ({ id: b._id, heading: b.heading, subheading: b.subheading })));

  } catch (err) {
    console.error("❌ Error seeding hero banners:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
