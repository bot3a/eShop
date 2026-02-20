import factory from "../../common/controllers/handler_controller.js";
import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "./../../common/utils/appError.js";
import Category from "./category_model.js";

import mongoose from "mongoose";

const CategoryController = {
  validateCategory: catchAsync(async (req, res, next) => {
    const categoryIdRaw = req.params.id || req.body.category;
    const categoryId = categoryIdRaw ? categoryIdRaw.trim() : null;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return next(new AppError("Invalid Category ID!", 400));
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return next(new AppError("Category Not found!", 404));
    }
    req.category = category;
    next();
  }),

  createCategory: catchAsync(async (req, res, next) => {
    const doc = await Category.create(req.body);
    res.status(201).json({
      status: "success",
      data: doc,
      message: "Category Created Succesfully!",
    });
  }),

  fetchCategoryById: catchAsync(async (req, res, next) => {
    const category = await Category.findById(req.params.id);
    return res.status(200).json({
      status: "success",
      data: category,
    });
  }),

  deleteCategory: catchAsync(async (req, res, next) => {
    const doc = await Category.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError("Document doesnt exists!", 404));
    }

    return res.status(204).send();
  }),

  updateCategory: catchAsync(async (req, res, next) => {
    const doc = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("Document doesnt exists!", 404));
    }
    return res.status(200).json({
      status: "success",
      data: doc,
      message: "Category Updated Succesfully!",
    });
  }),

  fetchAllCategories: catchAsync(async (req, res, next) => {
    const doc = await Category.find();

    return res.status(200).json({
      status: "success",
      data: doc,
      message: "Catgeory Fetched Successfully.",
    });
  }),
};

export default CategoryController;
