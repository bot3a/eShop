import { Router } from "express";
import ReviewController from "./review_controller.js";
import AuthController from "../auth/auth_controller.js";

const ReviewRoutes = Router({ mergeParams: true });

ReviewRoutes.get("/", ReviewController.getProductReviewsWithRatingsMap);

ReviewRoutes.use(AuthController.protect);
ReviewRoutes.post(
  "/",
  ReviewController.validate,
  ReviewController.createReview,
);

ReviewRoutes.get("/me", ReviewController.getMyReviews);

ReviewRoutes.route("/:reviewId")
  .patch(ReviewController.updateReview)
  .delete(ReviewController.deleteReview);

export default ReviewRoutes;
