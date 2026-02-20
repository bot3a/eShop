import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  mongooseOptions,
);

const WishList = model("WishList", wishlistSchema);
export default WishList;
