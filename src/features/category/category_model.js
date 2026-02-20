import { Schema, model } from "mongoose";
import mongooseOptions from "../../common/utils/mongooseOptions.js";

const categorySchema = new Schema(
  {
    title: {
      type: String,
      unique: true,
      required: [true, "Title is required"],
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
  },
  mongooseOptions
);

const Category = model("Category", categorySchema);
export default Category;
