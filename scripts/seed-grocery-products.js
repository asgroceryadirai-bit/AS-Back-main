import dns from "dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Book as Product } from "../models/Book.js";

dotenv.config();

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("⚠️ DNS override notice:", e?.message);
}

const GROCERY_PRODUCTS = [
  // 🥦 FRUITS & VEGETABLES
  {
    name: "Organic Robusta Bananas",
    author: "Local Organic Farm",
    price: 49,
    originalPrice: 65,
    discountPrice: 49,
    category: "Fruits & Vegetables",
    subCategory: "1 kg",
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80",
    stock: 50,
    rating: 4.9,
    reviewCount: 154,
    description: "Naturally ripened, sweet, and nutrient-dense organic Robusta bananas.",
    tags: ["Farm Fresh", "Organic"]
  },
  {
    name: "Royal Gala Crisp Red Apples",
    author: "Himachal Orchards",
    price: 180,
    originalPrice: 220,
    discountPrice: 180,
    category: "Fruits & Vegetables",
    subCategory: "1 kg",
    imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
    stock: 35,
    rating: 4.8,
    reviewCount: 88,
    description: "Juicy, crunchy red apples hand-picked from high-altitude Himachal orchards.",
    tags: ["Best Seller", "Imported Fresh"]
  },
  {
    name: "Fresh Hybrid Red Tomatoes",
    author: "Green Valley Farm",
    price: 38,
    originalPrice: 50,
    discountPrice: 38,
    category: "Fruits & Vegetables",
    subCategory: "1 kg",
    imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80",
    stock: 60,
    rating: 4.7,
    reviewCount: 110,
    description: "Farm-fresh ripe red tomatoes ideal for salads, curries, and sauces.",
    tags: ["Daily Fresh"]
  },
  {
    name: "Hass Fresh Avocados",
    author: "Tropical Fresh",
    price: 199,
    originalPrice: 250,
    discountPrice: 199,
    category: "Fruits & Vegetables",
    subCategory: "2 pcs (approx 400g)",
    imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80",
    stock: 20,
    rating: 4.9,
    reviewCount: 65,
    description: "Creamy, rich Hass avocados packed with healthy heart fats.",
    tags: ["Superfood"]
  },
  {
    name: "Fresh Baby Spinach Leaves",
    author: "Hydroponic Greens",
    price: 45,
    originalPrice: 60,
    discountPrice: 45,
    category: "Fruits & Vegetables",
    subCategory: "250g pack",
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
    stock: 30,
    rating: 4.8,
    reviewCount: 42,
    description: "Tender, pesticide-free washed baby spinach leaves ready for cooking.",
    tags: ["Hydroponic"]
  },

  // 🥛 DAIRY, EGGS & BAKERY
  {
    name: "Farm Fresh Whole Cow Milk",
    author: "Amul / Dairy Best",
    price: 32,
    originalPrice: 38,
    discountPrice: 32,
    category: "Dairy, Eggs & Bakery",
    subCategory: "1 L Pouch",
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80",
    stock: 80,
    rating: 4.9,
    reviewCount: 220,
    description: "Pasteurized, pure whole cow milk delivered fresh every morning.",
    tags: ["Daily Essential"]
  },
  {
    name: "Farm White Eggs (Pack of 12)",
    author: "Eggcellent Farms",
    price: 85,
    originalPrice: 100,
    discountPrice: 85,
    category: "Dairy, Eggs & Bakery",
    subCategory: "12 pcs",
    imageUrl: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=600&q=80",
    stock: 75,
    rating: 4.8,
    reviewCount: 140,
    description: "High-protein white eggs carefully cleaned and quality inspected.",
    tags: ["Protein Rich"]
  },
  {
    name: "Artisan Whole Wheat Sourdough Bread",
    author: "Fresh Bake House",
    price: 75,
    originalPrice: 90,
    discountPrice: 75,
    category: "Dairy, Eggs & Bakery",
    subCategory: "400g loaf",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    stock: 25,
    rating: 4.9,
    reviewCount: 88,
    description: "Slow-fermented artisan sourdough bread baked fresh daily with zero preservatives.",
    tags: ["Fresh Baked"]
  },
  {
    name: "Pure Cow Ghee (A2 Desi Ghee)",
    author: "Organic Vedic",
    price: 650,
    originalPrice: 750,
    discountPrice: 650,
    category: "Dairy, Eggs & Bakery",
    subCategory: "500 ml Glass Jar",
    imageUrl: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=600&q=80",
    stock: 30,
    rating: 5.0,
    reviewCount: 95,
    description: "Traditional Bilona churned pure A2 cow ghee with granular texture and rich aroma.",
    tags: ["Pure A2"]
  },

  // 🧃 BEVERAGES & JUICES
  {
    name: "Cold Pressed Valencia Orange Juice",
    author: "Raw Pressery",
    price: 120,
    originalPrice: 150,
    discountPrice: 120,
    category: "Beverages & Juices",
    subCategory: "500 ml bottle",
    imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80",
    stock: 40,
    rating: 4.8,
    reviewCount: 78,
    description: "100% squeezed oranges with zero added sugar or artificial water content.",
    tags: ["100% Juice"]
  },
  {
    name: "Organic Tender Coconut Water",
    author: "Natures Harvest",
    price: 55,
    originalPrice: 70,
    discountPrice: 55,
    category: "Beverages & Juices",
    subCategory: "200 ml bottle",
    imageUrl: "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=600&q=80",
    stock: 60,
    rating: 4.9,
    reviewCount: 110,
    description: "Natural electrolyte-rich fresh tender coconut water without preservatives.",
    tags: ["Natural Hydration"]
  },

  // 🌾 STAPLES, RICE & OILS
  {
    name: "Premium Royal Basmati Rice (Aged 2 Yrs)",
    author: "India Gate / Daawat",
    price: 340,
    originalPrice: 410,
    discountPrice: 340,
    category: "Staples, Rice & Oils",
    subCategory: "5 kg Bag",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    stock: 45,
    rating: 4.9,
    reviewCount: 165,
    description: "Extra long slender aged Basmati grains with divine aroma.",
    tags: ["Super Saver"]
  },
  {
    name: "Extra Virgin Cold Pressed Olive Oil",
    author: "Borges / Figari",
    price: 699,
    originalPrice: 850,
    discountPrice: 699,
    category: "Staples, Rice & Oils",
    subCategory: "1 L Bottle",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    stock: 25,
    rating: 4.9,
    reviewCount: 82,
    description: "Cold-pressed extra virgin olive oil ideal for dressings, sautéing, and cooking.",
    tags: ["Heart Healthy"]
  },

  // 🍿 SNACKS & PACKAGED FOODS
  {
    name: "Roasted Almonds & Sea Salt Nuts Mix",
    author: "Nutty Gritties",
    price: 299,
    originalPrice: 380,
    discountPrice: 299,
    category: "Snacks & Packaged Foods",
    subCategory: "250g Pouch",
    imageUrl: "https://images.unsplash.com/photo-1508061252966-1770d10b77b7?auto=format&fit=crop&w=600&q=80",
    stock: 50,
    rating: 4.8,
    reviewCount: 92,
    description: "Slow-roasted California almonds lightly seasoned with natural Himalayan pink salt.",
    tags: ["Healthy Snack"]
  },
  {
    name: "70% Dark Belgium Chocolate Bar",
    author: "Lindt / Amul",
    price: 150,
    originalPrice: 180,
    discountPrice: 150,
    category: "Snacks & Packaged Foods",
    subCategory: "100g Bar",
    imageUrl: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=600&q=80",
    stock: 35,
    rating: 4.9,
    reviewCount: 140,
    description: "Rich, velvety 70% cocoa dark chocolate crafted with fine cocoa beans.",
    tags: ["Rich Dark"]
  }
];

async function main() {
  const uri = process.env.MONGO_URI || "mongodb+srv://riydee_db_user:lgqjzv9QcphzJNSe@asgrocery.l4cexvb.mongodb.net/asgrocery?retryWrites=true&w=majority";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });
    console.log("✅ Connected to MongoDB Atlas (asgrocery)");

    // Clear old sample catalog entries & populate fresh grocery catalog
    await Product.deleteMany({});
    console.log("🧹 Cleared previous database items.");

    const inserted = await Product.insertMany(GROCERY_PRODUCTS);
    console.log(`✅ Successfully seeded ${inserted.length} fresh AS Grocery products into MongoDB!`);
  } catch (err) {
    console.error("❌ Error seeding grocery products:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
