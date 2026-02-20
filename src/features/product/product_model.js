import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";
import slugify from "slugify";

// const variantSchema = new Schema({
//   color: { type: String, required: true },
//   size: { type: String, required: true },
// });

const productSchema = new Schema(
  {
    title: {
      type: String,
      index: true,
      required: [true, "Title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100"],
      validate: {
        validator: function (val) {
          return val >= 0 && val <= 100;
        },
        message: "Discount must be between 0 and 100",
      },
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length >= 1 && arr.length <= 3;
        },
        message: "Product must have between 1 and 3 images",
      },
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    units_sold: {
      type: Number,
      default: 0,
      min: [0, "Units sold cannot be negative"],
    },
    ratings: {
      average: {
        type: Number,
        default: 2.5,
        min: [1, "Rating cannot be less than 1"],
        max: [5, "Rating cannot be more than 5"],
        set: (val) => Math.round(val * 10) / 10,
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
  },
  mongooseOptions,
);

productSchema.index({ price: 1 });

// Virtual for first image
productSchema.virtual("index0Image").get(function () {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Virtual for reviews
productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

// Auto-generate slug
productSchema.pre("save", function (next) {
  if (this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// Populate category automatically
productSchema.pre(/^find/, function (next) {
  this.populate({ path: "category", select: "title" });
  next();
});

// Update slug & validate discount on updates
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  // Slug update if title changes
  if (update.title || (update.$set && update.$set.title)) {
    const title = update.title ?? update.$set.title;
    const slug = slugify(title, { lower: true, strict: true });
    if (update.$set) {
      update.$set.slug = slug;
    } else {
      update.slug = slug;
    }
  }

  // Discount validation
  const discount = update.discount ?? update.$set?.discount;
  if (discount != null) {
    if (discount < 0 || discount > 100) {
      return next(new Error("Discount must be between 0 and 100"));
    }
  }

  next();
});

const Product = model("Product", productSchema);
export default Product;
