import mongoose from "mongoose";
import catchAsync from "../../common/utils/catchAsync.js";
import AppError from "../../common/utils/appError.js";
import WishList from "./wishlist_model.js";
import Product from "../product/product_model.js";

const formatProduct = (product) => ({
  id: product._id,
  title: product.title,
  price: product.price,
  discount: product.discount,
  stock: product.stock,
  index0Image: product.images?.[0] || null,
  category: product.category?.title || null, // category as string
  rating_avg: product.ratings?.average || null,
});

const formatProducts = (products = []) => products.map(formatProduct);

const WishListController = {
  validateWishListProduct: catchAsync(async (req, res, next) => {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(new AppError("Invalid product ID", 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    req.product = product;
    next();
  }),
  toggleWishlist: catchAsync(async (req, res, next) => {
    const productId = req.product._id;
    const userId = req.user._id;

    let wishlist = await WishList.findOne({ user: userId });

    let action; // to track if added or removed
    if (!wishlist) {
      wishlist = await WishList.create({
        user: userId,
        products: [productId],
      });
      action = "Added to wishlist";
    } else {
      const exists = wishlist.products.some(
        (id) => id.toString() === productId.toString(),
      );

      if (exists) {
        wishlist.products = wishlist.products.filter(
          (id) => id.toString() !== productId.toString(),
        );
        action = "Removed from wishlist";
      } else {
        wishlist.products.push(productId);
        action = "Added to wishlist";
      }

      await wishlist.save();
    }

    // Fetch the product that was toggled
    const toggledProduct = await Product.findById(productId).populate({
      path: "category",
      select: "title",
    });

    return res.status(200).json({
      status: "success",
      data: formatProduct(toggledProduct), // single product
      message: action,
    });
  }),

  getWishlist: catchAsync(async (req, res, next) => {
    const wishlist = await WishList.findOne({ user: req.user._id }).populate({
      path: "products",
      select: "title price discount stock images ratings category",
      populate: { path: "category", select: "title" },
    });

    return res.status(200).json({
      status: "success",
      data: formatProducts(wishlist?.products),
    });
  }),

  addToWishlist: catchAsync(async (req, res, next) => {
    const productId = req.product._id;

    let wishlist = await WishList.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await WishList.create({
        user: req.user._id,
        products: [productId],
      });
    } else {
      const exists = wishlist.products.some(
        (id) => id.toString() === productId.toString(),
      );

      if (exists) {
        return next(new AppError("Product is already in wishlist", 400));
      }

      wishlist.products.push(productId);
      await wishlist.save();
    }

    // Populate ONLY the product that was added
    const addedProduct = await Product.findById(productId).populate({
      path: "category",
      select: "title",
    });

    return res.status(201).json({
      status: "success",
      data: formatProduct(addedProduct), // returns only the added product
    });
  }),

  removeFromWishlist: catchAsync(async (req, res, next) => {
    const wishlist = await WishList.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: req.product._id } },
      { new: true },
    ).populate({
      path: "products",
      select: "title price discount stock images ratings category",
      populate: { path: "category", select: "title" },
    });

    return res.status(200).json({
      status: "success",
      data: formatProducts(wishlist?.products),
    });
  }),
};

export default WishListController;
