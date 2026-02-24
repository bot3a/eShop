import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";
import Review from "./review_model.js";
import Product from "../product/product_model.js";
import Order from "./../order/order_model.js";
import mongoose from "mongoose";

const ReviewController = {
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

    req.body.user = req.user.id;
    req.body.product = productId;

    next();
  }),

  createReview: catchAsync(async (req, res, next) => {
    const user = req.user;
    const { productId } = req.params;
    const { review, rating, orderId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userInfo.userId.toString() !== user.id.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to review this order" });
    }

    if (order.status !== "delivered") {
      return res
        .status(400)
        .json({ error: "Can only review delivered orders" });
    }

    const orderItem = order.orderItems.find(
      (item) => item.product.toString() === productId.toString(),
    );

    if (!orderItem) {
      return res.status(400).json({ error: "Product not found in this order" });
    }

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

    const newReview = await Review.create({
      userId: user.id,
      product: productId,
      orderId,
      review,
      rating,
    });

    await newReview.populate({ path: "userId", select: "name" });

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

  getProductReviewsWithRatingsMap: catchAsync(async (req, res, next) => {
    const reviews = await Review.find({
      product: req.params.productId,
    });

    const ratings = reviews.map((r) => r.rating);
    const roundedRatings = ratings.map((r) => Math.round(r));

    const counts = [1, 2, 3, 4, 5].map(
      (r) => roundedRatings.filter((x) => x === r).length,
    );
    const maxCount = Math.max(...counts, 1);
    const normalized = counts.map((c) => c / maxCount).reverse();

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const reviewsWithVerified = reviews.map((r) => ({
      ...r.toObject(),
      verifiedPurchase: !!r.order,
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

  deleteReview: catchAsync(async (req, res, next) => {
    const doc = await Review.findByIdAndDelete(req.params.reviewId);
    if (!doc) return next(new AppError("Document doesn't exist!", 404));

    await ReviewController.updateProductRatings(doc.product);

    res.status(204).json({ status: "success", data: null });
  }),

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
