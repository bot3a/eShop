import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesFolder = path.join(__dirname, "imagesUpload");

// Category IDs mapped to starting number
const categoryMap = {
  1: "694113797b8871b6c86e7526", // Fashion
  2: "69413a1a8e0e3d48d11f7bf6", // Gaming
  3: "6941514953b6969aed2d3ec6", // Home
  4: "6941514f53b6969aed2d3ec9", // Beauty
  5: "6941515653b6969aed2d3ecc", // Sports
  6: "6941516553b6969aed2d3ecf", // Jewelry
  7: "6941513f53b6969aed2d3ec3", // Electronics
};

// Random helpers
const randomPrice = () => Math.floor(Math.random() * (500 - 50 + 1)) + 50;
const randomDiscount = () => Math.floor(Math.random() * 51);
const randomStock = () => Math.floor(Math.random() * 20) + 1;

// Fake description generator (30–80 words)
const generateFakeDescription = () => {
  const words = [
    "premium",
    "quality",
    "durable",
    "stylish",
    "modern",
    "elegant",
    "comfortable",
    "lightweight",
    "perfect",
    "designed",
    "crafted",
    "experience",
    "performance",
    "excellent",
    "amazing",
    "product",
    "value",
    "affordable",
    "innovative",
    "beautiful",
    "compact",
    "versatile",
    "long-lasting",
    "reliable",
    "exclusive",
  ];

  const wordCount = Math.floor(Math.random() * (80 - 30 + 1)) + 30;
  let desc = [];

  for (let i = 0; i < wordCount; i++) {
    desc.push(words[Math.floor(Math.random() * words.length)]);
  }

  return desc.join(" ") + ".";
};

// Read image files
const files = fs.readdirSync(imagesFolder);

// Pick 5 random featured indexes
const featuredIndexes = new Set();
while (featuredIndexes.size < 5 && featuredIndexes.size < files.length) {
  featuredIndexes.add(Math.floor(Math.random() * files.length));
}

// Build products array
const products = files.map((file, index) => {
  const nameWithoutExt = file.replace(/\.[^/.]+$/, "");

  // Extract starting number
  const match = nameWithoutExt.match(/^(\d+)/);
  const categoryNumber = match ? parseInt(match[1]) : null;

  // Remove starting numbers and trim
  const cleanTitle = nameWithoutExt.replace(/^\d+/, "").trim();

  return {
    title: cleanTitle,
    description: generateFakeDescription(),
    price: randomPrice(),
    discount: randomDiscount(),
    is_featured: featuredIndexes.has(index),
    category: categoryMap[categoryNumber] || null,
    stock: randomStock(),
    image: [file],
  };
});

// Save to products.json
fs.writeFileSync(
  path.join(__dirname, "products.json"),
  JSON.stringify(products, null, 2),
);
console.log("✅ products.json generated with", products.length, "products");
