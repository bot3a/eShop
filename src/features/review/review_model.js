import { Schema, model } from "mongoose";
import Product from "./../product/product_model.js";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const reviewSchema = new Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, "Review must have a rating"],
    },

    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Review must belong to Product."],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to User."],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Review must belong to an Order."],
    },
  },
  mongooseOptions,
);

reviewSchema.index({ product: 1, userId: 1, orderId: 1 }, { unique: true });

// Calculate average rating & quantity
reviewSchema.statics.calcAvgRatings = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(
      productId,
      {
        "ratings.average": Math.round(stats[0].avgRating * 10) / 10,
        "ratings.quantity": stats[0].nRating,
      },
      { new: true, runValidators: true },
    );
  } else {
    await Product.findByIdAndUpdate(productId, {
      "ratings.average": 4.5,
      "ratings.quantity": 0,
    });
  }
};

// Recalculate ratings after save
reviewSchema.post("save", function () {
  this.constructor.calcAvgRatings(this.product);
});

// Recalculate ratings after findOneAndUpdate or findOneAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.clone().findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  if (this.r) {
    await this.r.constructor.calcAvgRatings(this.r.product);
  }
});

// Populate user by default
reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: "userId", select: "name" });
  next();
});

const Review = model("Review", reviewSchema);
export default Review;
