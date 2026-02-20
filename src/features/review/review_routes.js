import { Router } from "express";
import ReviewController from "./review_controller.js";
import AuthController from "../auth/auth_controller.js";

const ReviewRoutes = Router({ mergeParams: true });

// Get reviews for a product with normalized ratings map
ReviewRoutes.get("/", ReviewController.getProductReviewsWithRatingsMap);

// Create a review for a product
ReviewRoutes.post(
  "/",
  AuthController.protect,
  ReviewController.validate,
  ReviewController.createReview,
);

ReviewRoutes.get("/me", AuthController.protect, ReviewController.getMyReviews);

// Update or delete a review by ID
ReviewRoutes.route("/:reviewId")
  .patch(AuthController.protect, ReviewController.updateReview)
  .delete(
    AuthController.protect,
    // AuthController.restrictTo("admin"), // optional restriction
    ReviewController.deleteReview,
  );

export default ReviewRoutes;
