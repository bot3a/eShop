import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address_line1: { type: String, required: true },
    address_line2: { type: String, default: "" },

    city: { type: String, required: true },
    state: { type: String, required: true },
    postal_code: { type: String, required: true },
    country: { type: String, default: "Nepal" },
    optional_remarks: { type: String, default: "" },
    is_default: { type: Boolean, default: false },
  },
  mongooseOptions,
);

export default model("Address", addressSchema);
