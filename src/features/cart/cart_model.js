import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
  },
  mongooseOptions,
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  mongooseOptions,
);

cartSchema.pre(/^find/, function (next) {
  this.populate({
    path: "items.product",
    select: "title price discount images stock",
  });
  next();
});

const Cart = model("Cart", cartSchema);
export default Cart;
