// seed_product.js
import "dotenv/config"; // loads process.env from .env
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import cloudinary from "cloudinary";
import Product from "../../features/product/product_model.js";

// --------------------
// 1️⃣ Cloudinary config
// --------------------

cloudinary.v2.config({
  cloud_name: "dojgo4lip",
  api_key: "316125962452774",
  api_secret: "43U51IXJ5Rb4piNYPqq-iMc28w4",
});

// --------------------
// 2️⃣ MongoDB connection
// --------------------
const DB =
  "mongodb+srv://admin:123@cluster0.8nqccpo.mongodb.net/ecommerce?retryWrites=true&w=majority";

try {
  await mongoose.connect(DB);
  console.log("✅ Connected to MongoDB");
} catch (err) {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
}

// --------------------
// 3️⃣ Paths and products
// --------------------
const PRODUCTS_JSON = path.resolve("./products.json");
const IMAGES_FOLDER = path.resolve("../../common/seeders/imagesUpload");

// Read JSON file
const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, "utf-8"));

// --------------------
// 4️⃣ Seeder function
// --------------------
const seedProducts = async () => {
  try {
    await Product.deleteMany();
    console.log("🧹 Products cleared");

    for (const prod of products) {
      const imagePaths = Array.isArray(prod.images)
        ? prod.images
        : [prod.images];
      const uploadResults = [];

      for (const img of imagePaths) {
        const imgPath = path.join(IMAGES_FOLDER, img);
        if (!fs.existsSync(imgPath)) {
          console.warn(`⚠️ Image not found: ${img}, skipping`);
          continue;
        }

        const result = await cloudinary.v2.uploader.upload(imgPath, {
          folder: "products",
        });
        uploadResults.push(result.secure_url);
      }

      // Use placeholder if no images uploaded
      if (uploadResults.length === 0) {
        const placeholderPath = path.join(IMAGES_FOLDER, "placeholder.jpg");
        if (fs.existsSync(placeholderPath)) {
          const result = await cloudinary.v2.uploader.upload(placeholderPath, {
            folder: "products",
          });
          uploadResults.push(result.secure_url);
        } else {
          console.warn(
            `⚠️ Placeholder image not found. Product "${prod.title}" will have no images.`,
          );
        }
      }

      // Create product in DB
      await Product.create({
        title: prod.title,
        slug: prod.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, ""),
        description: prod.description,
        price: prod.price,
        discount: prod.discount || 0,
        stock: prod.stock || 0,
        is_featured: prod.is_featured || false,
        category: prod.category,
        images: uploadResults,
      });

      console.log(`✅ Product "${prod.title}" uploaded`);
    }

    console.log(`🎉 All products seeded`);
    await mongoose.disconnect();
    console.log("🛑 MongoDB disconnected");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

// --------------------
// 5️⃣ Run seeder
// --------------------
seedProducts();
