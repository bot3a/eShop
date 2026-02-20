import { Router } from "express";
import CategoryController from "./category_controller.js";
import AuthController from "../auth/auth_controller.js";

const CategoryRoutes = Router();

CategoryRoutes.route("/").get(CategoryController.fetchAllCategories);
CategoryRoutes.route("/:id").get(CategoryController.fetchCategoryById);

CategoryRoutes.use(AuthController.protect, AuthController.restrictTo("admin"));

CategoryRoutes.route("/").post(CategoryController.createCategory);

CategoryRoutes.route("/:id")
  .patch(CategoryController.validateCategory, CategoryController.updateCategory)
  .delete(
    CategoryController.validateCategory,
    CategoryController.deleteCategory,
  );

export default CategoryRoutes;
