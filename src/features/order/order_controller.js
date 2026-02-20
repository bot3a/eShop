import AppError from "../../common/utils/appError.js";
import Product from "../product/product_model.js";
import Review from "./../review/review_model.js";
import Order from "./order_model.js";
import Address from "./../address/address_model.js";
import Cart from "../cart/cart_model.js";

import { sendCustomNotificationService } from "./../../common/config/notification_service.js";

const OrderController = {
  createOrder: async (req, res, next) => {
    try {
      const user = req.user;

      const shippingAddress = await Address.findOne({
        user: req.user.id,
        is_default: true,
      });

      if (!shippingAddress) {
        return next(new AppError("Shipping address is required", 400));
      }

      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product",
      );

      if (!cart || cart.items.length === 0) {
        return next(new AppError("Cart is empty", 400));
      }

      const existingOrder = await Order.findOne({
        user: req.user.id,
        status: "pending",
        isPaid: false,
      });

      if (existingOrder) {
        return next(new AppError("You already have a pending order", 409));
      }

      let subtotal = 0;
      const orderItems = [];

      /* 4️⃣ Validate stock & build order items */
      for (const item of cart.items) {
        const product = item.product;

        if (!product) {
          return next(new AppError("Product not found", 404));
        }

        if (product.stock < item.quantity) {
          return next(
            new AppError(`Insufficient stock for ${product.title}`, 400),
          );
        }

        const discount = product.discount ?? 0;
        const price = Number(
          (product.price - (product.price * discount) / 100).toFixed(2),
        );

        subtotal += price * item.quantity;

        orderItems.push({
          product: product._id,
          title: product.title,
          price,
          quantity: item.quantity,
          image: product.images[0],
        });
      }

      subtotal = Number(subtotal.toFixed(2));
      const shippingPrice = 170;
      const taxPrice = Number((subtotal * 0.13).toFixed(2));
      const totalPrice = Number(
        (subtotal + shippingPrice + taxPrice).toFixed(2),
      );

      /* 5️⃣ Create COD order */
      const order = await Order.create({
        userInfo: {
          userId: user._id,
          name: user.name,
          email: user.email ?? "",
          phone: user.phone ?? "",
        },
        orderItems,
        shippingAddress: {
          address_line1: shippingAddress.address_line1,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country ?? "Nepal",
          optional_remarks: shippingAddress.optional_remarks ?? "",
        },
        paymentMethod: "COD",
        isPaid: false,
        itemsPrice: subtotal,
        shippingPrice,
        taxPrice,
        totalPrice,
        status: "pending",
        shippedAt: null,
        deliveredAt: null,
      });

      /* 6️⃣ Reduce product stock */
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      /* 7️⃣ Clear cart */
      cart.items = [];
      await cart.save();

      await sendCustomNotificationService({
        userId: user.id,
        safeTitle: "Order Created",
        safeBody: "Your order has been placed successfully.",
        safeType: "order",
      });

      return res.status(201).json({
        status: "success",
        message: "Order placed successfully (Cash on Delivery)",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  /* ////////////////////////////////////////////////////////////////////////////////////////////// */

  getOrderByPaymentIntent: async (req, res, next) => {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({ error: "PaymentIntent ID is required" });
      }

      const order = await Order.findOne({
        "paymentResult.id": paymentIntentId,
      }).populate("shippingAddress");

      if (!order) {
        return res.status(404).json({ error: "Order not found yet" });
      }
      res.status(200).json({
        status: "success",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  getAllOrders: async (req, res, next) => {
    console.log("Logged in user:", req.user);

    // ✅ Filter by embedded userInfo.userId
    const orders = await Order.find({ "userInfo.userId": req.user._id }).sort({
      createdAt: -1,
    });

    console.log("Orders found:", orders);

    const orderIds = orders.map((order) => order._id);

    const reviews = await Review.find({ orderId: { $in: orderIds } });
    const reviewedOrderIds = new Set(
      reviews.map((review) => review.orderId.toString()),
    );

    const ordersWithReviewStatus = orders.map((order) => {
      const reviewed = reviewedOrderIds.has(order._id.toString());

      return {
        ...order.toObject(),
        hasReviewed: reviewed,
        canReview: order.status === "delivered" && !reviewed,
      };
    });

    res.status(200).json({
      status: "success",
      data: ordersWithReviewStatus,
    });
  },

  getOrderById: async (req, res, next) => {
    try {
      const { orderId } = req.params; // must match route
      console.log("Fetching order ID:", orderId);

      const order = await Order.findOne({
        _id: orderId,
        "userInfo.userId": req.user._id,
      });

      if (!order) {
        return res
          .status(404)
          .json({ status: "fail", message: "Order not found" });
      }

      const review = await Review.findOne({ orderId: order._id });
      const hasReviewed = !!review;
      const canReview = order.status === "delivered" && !hasReviewed;

      res.status(200).json({
        status: "success",
        data: { ...order.toObject(), hasReviewed, canReview },
      });
    } catch (error) {
      next(error);
    }
  },

  updateOrderStatus: async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body; // pending | confirmed | shipped | delivered | cancelled

      // Validate status
      const allowedStatuses = [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }

      // Update timestamps based on status
      if (status === "shipped" && order.status !== "shipped") {
        order.shippedAt = new Date();
      } else if (status === "delivered" && order.status !== "delivered") {
        order.deliveredAt = new Date();
      }

      // Update status
      order.status = status;

      // Save updated order
      const updatedOrder = await order.save();

      // Check if a review exists for this order
      const review = await Review.findOne({ orderId: updatedOrder._id });
      const hasReviewed = !!review;
      const canReview = updatedOrder.status === "delivered" && !hasReviewed;

      // Return response including dynamic review flags
      res.status(200).json({
        status: "success",
        data: { ...updatedOrder.toObject(), hasReviewed, canReview },
      });
    } catch (error) {
      next(error);
    }
  },
  // updateOrderStatus: async (req, res, next) => {
  //   try {
  //     const { orderId } = req.params;
  //     const { status } = req.body; // new status: pending | shipped | delivered

  //     // Validate status
  //     const allowedStatuses = [
  //       "pending",
  //       "confirmed",
  //       "shipped",
  //       "delivered",
  //       "cancelled",
  //     ];
  //     if (!allowedStatuses.includes(status)) {
  //       return res.status(400).json({ message: "Invalid status value." });
  //     }

  //     // Find the order
  //     const order = await Order.findById(orderId);
  //     if (!order) {
  //       return res.status(404).json({ message: "Order not found." });
  //     }

  //     // Update timestamps based on status
  //     if (status === "shipped" && order.status !== "shipped") {
  //       order.shippedAt = new Date();
  //     } else if (status === "delivered" && order.status !== "delivered") {
  //       order.deliveredAt = new Date();
  //     }

  //     // Update status
  //     order.status = status;

  //     // Save the updated order
  //     const updatedOrder = await order.save();

  //     res.status(200).json({
  //       message: "Order status updated successfully",
  //       order: updatedOrder,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },
};
export default OrderController;
