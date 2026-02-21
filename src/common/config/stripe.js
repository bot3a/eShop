// config/stripe.js
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia", // Use a valid version
});
