import mongoose from "mongoose";
import Product from "./../../product/product_model.js";
import AppError from "./../../../common/utils/appError.js";
import catchAsync from "./../../../common/utils/catchAsync.js";

export const validateCartInput = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;
  console.log(productId);

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError("Invalid product ID", 400));
  }

  const productDoc = await Product.findById(productId);
  if (!productDoc) {
    return next(new AppError("Product not found", 404));
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return next(new AppError("Quantity must be a positive integer", 400));
  }

  if (quantity > productDoc.stock) {
    return next(new AppError("Out of Stock", 400));
  }

  req.body.product = productDoc._id;
  req.body.quantity = quantity;

  console.log(req.body);
  console.log("ee");

  next();
});
