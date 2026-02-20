import mongoose from "mongoose";
import mongooseOptions from "./../../../common/utils/mongooseOptions.js";

const trackingItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: "no_img" },
    orderItemStatus: {
      type: String,
      enum: ["orderPlaced", "inProgress", "shipped", "delivered"],
      default: "orderPlaced",
    },

    statusDates: {
      orderPlaced: { type: Date, default: Date.now },
      inProgress: { type: Date },
      shipped: { type: Date },
      delivered: { type: Date },
    },

    expectedDelivery: { type: Date },
  },
  mongooseOptions
);

trackingItemSchema.pre("save", function (next) {
  if (
    this.isModified("orderItemStatus") &&
    this.statusDates.hasOwnProperty(this.orderItemStatus)
  ) {
    this.statusDates[this.orderItemStatus] = new Date();
  }
  next();
});

export const TrackingItem = mongoose.model("TrackingItem", trackingItemSchema);
