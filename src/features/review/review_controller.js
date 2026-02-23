import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";
import Review from "./review_model.js";
import Product from "../product/product_model.js";
import Order from "./../order/order_model.js";
import mongoose from "mongoose";

const ReviewController = {
  // Validate review input
  validate: catchAsync(async (req, res, next) => {
    const { review, rating } = req.body;
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(new AppError("Invalid product ID", 400));
    }

    const productExists = await Product.findById(productId);
    if (!productExists) {
      return next(new AppError("Product not found", 404));
    }

    if (rating === undefined) {
      return next(new AppError("Missing RATING!", 400));
    }

    if (!review) {
      return next(new AppError("Missing REVIEW!", 400));
    }

    // attach userId and productId to req.body
    req.body.user = req.user.id;
    req.body.product = productId;

    next();
  }),

  createReview: catchAsync(async (req, res, next) => {
    const user = req.user;
    const { productId } = req.params;
    const { review, rating, orderId } = req.body;

    // 1️⃣ Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 2️⃣ Check order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 3️⃣ Verify order ownership (FIXED ObjectId compare)
    if (order.userInfo.userId.toString() !== user.id.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to review this order" });
    }

    // 4️⃣ Must be delivered
    if (order.status !== "delivered") {
      return res
        .status(400)
        .json({ error: "Can only review delivered orders" });
    }

    // 5️⃣ Check product exists in order
    const orderItem = order.orderItems.find(
      (item) => item.product.toString() === productId.toString(),
    );

    if (!orderItem) {
      return res.status(400).json({ error: "Product not found in this order" });
    }

    // 6️⃣ Prevent duplicate review (FIXED FIELD)
    const existingReview = await Review.findOne({
      userId: user.id,
      product: productId,
      orderId,
    });

    if (existingReview) {
      return res.status(400).json({
        error: "You already reviewed this product for this order",
      });
    }

    // 7️⃣ Create review
    const newReview = await Review.create({
      userId: user.id,
      product: productId,
      orderId,
      review,
      rating,
    });

    await newReview.populate({ path: "userId", select: "name" });

    // 8️⃣ Mark order item as reviewed
    await Order.updateOne(
      {
        _id: orderId,
        "orderItems.product": productId,
      },
      {
        $set: {
          "orderItems.$.isReviewed": true,
        },
      },
    );

    res.status(201).json({
      status: "success",
      data: {
        ...newReview.toObject(),
        verifiedPurchase: true,
        hasReviewed: true,
        canReview: false,
      },
    });
  }),

  getMyReviews: catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const reviews = await Review.find({ userId: userId });
    res.status(200).json({
      status: "success",
      data: reviews,
    });
  }),

  // Get product reviews with ratings map and verifiedPurchase
  getProductReviewsWithRatingsMap: catchAsync(async (req, res, next) => {
    const reviews = await Review.find({
      product: req.params.productId,
    });

    const ratings = reviews.map((r) => r.rating);
    const roundedRatings = ratings.map((r) => Math.round(r));

    // Histogram 1–5
    const counts = [1, 2, 3, 4, 5].map(
      (r) => roundedRatings.filter((x) => x === r).length,
    );
    const maxCount = Math.max(...counts, 1);
    const normalized = counts.map((c) => c / maxCount).reverse();

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    // Add verifiedPurchase flag for frontend
    const reviewsWithVerified = reviews.map((r) => ({
      ...r.toObject(),
      verifiedPurchase: !!r.order, // if order exists, it's verified
    }));

    res.status(200).json({
      status: "success",
      data: {
        reviewCount: reviews.length,
        averageReview: parseFloat(avgRating.toFixed(2)),
        ratingsMap: normalized,
        reviews: reviewsWithVerified,
      },
    });
  }),

  // Update a review
  updateReview: catchAsync(async (req, res, next) => {
    const doc = await Review.findByIdAndUpdate(req.params.reviewId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) return next(new AppError("Document doesn't exist!", 404));

    await ReviewController.updateProductRatings(doc.product);

    res.status(200).json({
      status: "success",
      data: doc,
    });
  }),

  // Delete a review
  deleteReview: catchAsync(async (req, res, next) => {
    const doc = await Review.findByIdAndDelete(req.params.reviewId);
    if (!doc) return next(new AppError("Document doesn't exist!", 404));

    await ReviewController.updateProductRatings(doc.product);

    res.status(204).json({ status: "success", data: null });
  }),

  // Update product ratings
  updateProductRatings: async (productId) => {
    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          numRatings: { $sum: 1 },
        },
      },
    ]);

    await Product.findByIdAndUpdate(productId, {
      ratings: {
        average: stats[0]?.avgRating || 0,
        quantity: stats[0]?.numRatings || 0,
      },
    });
  },
};

export default ReviewController;

// import { Order } from "../models/order.model.js";
// import { Product } from "../models/product.model.js";
// import { Review } from "../models/review.model.js";

// export async function createReview(req, res) {
//   try {
//     const { productId, orderId, rating } = req.body;

//     if (!rating || rating < 1 || rating > 5) {
//       return res.status(400).json({ error: "Rating must be between 1 and 5" });
//     }

//     const user = req.user;

//     // verify order exists and is delivered
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     if (order.clerkId !== user.clerkId) {
//       return res
//         .status(403)
//         .json({ error: "Not authorized to review this order" });
//     }

//     if (order.status !== "delivered") {
//       return res
//         .status(400)
//         .json({ error: "Can only review delivered orders" });
//     }

//     // verify product is in the order
//     const productInOrder = order.orderItems.find(
//       (item) => item.product.toString() === productId.toString(),
//     );
//     if (!productInOrder) {
//       return res.status(400).json({ error: "Product not found in this order" });
//     }

//     // atomic update or create
//     const review = await Review.findOneAndUpdate(
//       { productId, userId: user._id },
//       { rating, orderId, productId, userId: user._id },
//       { new: true, upsert: true, runValidators: true },
//     );

//     // update the product rating with atomic aggregation
//     const reviews = await Review.find({ productId });
//     const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
//     const updatedProduct = await Product.findByIdAndUpdate(
//       productId,
//       {
//         averageRating: totalRating / reviews.length,
//         totalReviews: reviews.length,
//       },
//       { new: true, runValidators: true },
//     );

//     if (!updatedProduct) {
//       await Review.findByIdAndDelete(review._id);
//       return res.status(404).json({ error: "Product not found" });
//     }

//     res.status(201).json({ message: "Review submitted successfully", review });
//   } catch (error) {
//     console.error("Error in createReview controller:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

// export async function deleteReview(req, res) {
//   try {
//     const { reviewId } = req.params;

//     const user = req.user;

//     const review = await Review.findById(reviewId);
//     if (!review) {
//       return res.status(404).json({ error: "Review not found" });
//     }

//     if (review.userId.toString() !== user._id.toString()) {
//       return res
//         .status(403)
//         .json({ error: "Not authorized to delete this review" });
//     }

//     const productId = review.productId;
//     await Review.findByIdAndDelete(reviewId);

//     const reviews = await Review.find({ productId });
//     const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
//     await Product.findByIdAndUpdate(productId, {
//       averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
//       totalReviews: reviews.length,
//     });

//     res.status(200).json({ message: "Review deleted successfully" });
//   } catch (error) {
//     console.error("Error in deleteReview controller:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }
