import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

// Order item sub-schema
const orderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  title: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
});

const shippingAddressSchema = new Schema({
  address_line1: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postal_code: { type: String, required: true },
  country: { type: String, default: "Nepal" },
  optional_remarks: { type: String, default: "" },
});

const userInfoSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: "" },
});

const orderSchema = new Schema(
  {
    userInfo: {
      type: userInfoSchema,
      required: true,
    },

    orderItems: {
      type: [orderItemSchema],
      required: true,
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    // 🔹 Payment
    paymentMethod: {
      type: String,
      enum: ["COD", "CARD"],
      default: "COD",
    },

    isPaid: {
      type: Boolean,
      default: false,
    },

    paidAt: Date,

    paymentResult: {
      id: String,
      status: String,
    },

    // 🔹 Price breakdown
    itemsPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    taxPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    shippedAt: Date,
    deliveredAt: Date,
  },
  mongooseOptions, // timestamps: true
);

orderSchema.index({ "userInfo.userId": 1, status: 1, isPaid: 1 });

const Order = model("Order", orderSchema);
export default Order;
