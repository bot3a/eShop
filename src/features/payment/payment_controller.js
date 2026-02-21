import Cart from "../cart/cart_model.js";
import AppError from "../../common/utils/appError.js";
import catchAsync from "../../common/utils/catchAsync.js";
import Product from "../product/product_model.js";
import User from "./../user/user_model.js";
import Order from "./../order/order_model.js";
import Address from "../address/address_model.js";
import { sendCustomNotificationService } from "./../../common/config/notification_service.js";

import { stripe } from "./../../common/config/stripe.js";

const PaymentController = {
  handleWebhook: async (req, res, next) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Construct the Stripe event
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      console.log("Payment succeeded:", paymentIntent.id);

      try {
        const metadata = paymentIntent.metadata || {};

        const userInfo = metadata.userInfo
          ? JSON.parse(metadata.userInfo)
          : null;
        const orderItems = metadata.orderItems
          ? JSON.parse(metadata.orderItems)
          : [];
        const shippingAddress = metadata.shippingAddress
          ? JSON.parse(metadata.shippingAddress)
          : null;
        const totalPrice = metadata.totalPrice
          ? parseFloat(metadata.totalPrice)
          : 0;

        if (
          !userInfo ||
          !orderItems.length ||
          !shippingAddress ||
          !totalPrice
        ) {
          console.error("Missing metadata in paymentIntent:", paymentIntent.id);
          return res.status(400).send("Invalid payment metadata");
        }

        // Prevent duplicate orders
        const existingOrder = await Order.findOne({
          "paymentResult.id": paymentIntent.id,
        });
        if (existingOrder) {
          console.log("Order already exists for payment:", paymentIntent.id);
          return res.json({ received: true });
        }

        // Create the order
        const order = await Order.create({
          userInfo, // embedded object
          orderItems,
          shippingAddress, // embedded object
          paymentResult: {
            id: paymentIntent.id,
            status: "succeeded",
          },
          itemsPrice: orderItems.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0,
          ),
          shippingPrice: 170,
          taxPrice: Number(
            (
              orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0) *
              0.13
            ).toFixed(2),
          ),
          totalPrice,
          isPaid: true,
          paymentMethod: "CARD",
          status: "pending",
        });

        for (const item of orderItems) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: {
              stock: -item.quantity, // reduce stock
              units_sold: item.quantity, // increase units sold
            },
          });
        }

        const cart = await Cart.findOne({ user: userInfo.userId });
        if (cart) {
          cart.items = [];
          await cart.save();
        }

        // cart.items = [];
        // await cart.save();
        console.log("Order created successfully:", order._id);

        // Notify user
        await sendCustomNotificationService({
          userId: userInfo.userId,
          safeTitle: "Order Created",
          safeBody: "Your order has been placed successfully.",
          safeType: "order",
        });
      } catch (error) {
        console.error("Error creating order from webhook:", error);
        return res.status(500).send("Internal Server Error");
      }
    }

    // Always respond 200 to Stripe
    res.json({ received: true });
  },

  createPaymentIntent: async (req, res, next) => {
    try {
      const user = req.user;

      // 1️⃣ Get default shipping address
      const shippingAddress = await Address.findOne({
        user: user._id,
        is_default: true,
      });

      if (!shippingAddress) {
        return next(new AppError("Shipping address is required", 400));
      }

      // 2️⃣ Get cart items
      const cart = await Cart.findOne({ user: user.id }).populate(
        "items.product",
      );

      if (!cart || cart.items.length === 0) {
        return next(new AppError("Cart is empty", 400));
      }

      // 3️⃣ Prepare validated items and subtotal
      let subtotal = 0;
      const validatedItems = [];

      for (const item of cart.items) {
        const product = item.product;

        if (!product) {
          return next(new AppError("Product not found!", 404));
        }

        if (product.stock < item.quantity) {
          return next(
            new AppError(`Insufficient stock for ${product.title}`, 400),
          );
        }

        const discountPercent = product.discount ?? 0;
        const discountedPrice = Number(
          (product.price - (product.price * discountPercent) / 100).toFixed(2),
        );

        const itemTotal = Number((discountedPrice * item.quantity).toFixed(2));
        subtotal += itemTotal;

        validatedItems.push({
          product: product._id.toString(),
          title: product.title,
          price: discountedPrice,
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

      if (totalPrice <= 0) {
        return next(new AppError("Invalid order total", 400));
      }

      // 5️⃣ Find or create Stripe customer
      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: user.id },
        });
        await User.findByIdAndUpdate(user.id, {
          stripeCustomerId: customer.id,
        });
      }

      // Prepare clean shipping address
      const cleanShippingAddress = {
        address_line1: shippingAddress.address_line1,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country ?? "Nepal",
        optional_remarks: shippingAddress.optional_remarks ?? "",
      };

      // Prepare user info
      const userInfo = {
        userId: user._id,
        name: user.name,
        email: user.email ?? "",
        phone: user.phone ?? "",
      };

      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100), // cents
        currency: "usd",
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
        metadata: {
          userInfo: JSON.stringify(userInfo), // embed user info
          orderItems: JSON.stringify(validatedItems),
          shippingAddress: JSON.stringify(cleanShippingAddress),
          totalPrice: totalPrice.toFixed(2),
        },
      });

      // 7️⃣ Return client secret
      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("Stripe PaymentIntent Error:", error);
      next(new AppError("Failed to create payment intent", 500));
    }
  },
};

export default PaymentController;
