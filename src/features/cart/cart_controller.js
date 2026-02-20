import Cart from "./cart_model.js";
import catchAsync from "../../common/utils/catchAsync.js";
import Product from "./../product/product_model.js";

const formatCartItem = (item) => ({
  id: item._id,
  product: {
    id: item.product._id,
    title: item.product.title,
    price: item.product.price,
    discount: item.product.discount,
    image: item.product.images[0],
    stock: item.product.stock,
    category: item.product.category.title,
  },
  quantity: item.quantity,
});

const CartController = {
  getCart: catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: { path: "category", select: "title" },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({ status: "success", data: [] });
    }

    const formattedItems = cart.items.map(formatCartItem);

    res.status(200).json({ status: "success", data: formattedItems });
  }),

  addToCart: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { product, quantity } = req.body;

    // 1️⃣ If product already exists in cart → increment quantity
    let cart = await Cart.findOneAndUpdate(
      { user: userId, "items.product": product._id },
      { $inc: { "items.$.quantity": quantity } },
      { new: true },
    );

    // 2️⃣ If product not in cart → push new item
    if (!cart) {
      cart = await Cart.findOneAndUpdate(
        { user: userId },
        { $push: { items: { product, quantity } } },
        { new: true, upsert: true },
      );
    }

    // 3️⃣ Populate product details
    await cart.populate({
      path: "items.product",
      populate: { path: "category", select: "title" },
    });

    // 4️⃣ Get the updated cart item
    const cartItem = cart.items.find(
      (item) => item.product._id.toString() === product.toString(),
    );

    res.status(200).json({
      status: "success",
      data: formatCartItem(cartItem),
    });
  }),

  updateCart: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    let { product, quantity } = req.body;

    const productDoc = await Product.findById(product);
    if (quantity > productDoc.stock) {
      quantity = productDoc.stock;
    }

    let cart;

    if (quantity === 0) {
      // Remove item from cart
      cart = await Cart.findOneAndUpdate(
        { user: userId },
        { $pull: { items: { product } } },
        { new: true },
      );
    } else {
      // Update quantity
      cart = await Cart.findOneAndUpdate(
        { user: userId, "items.product": product },
        { $set: { "items.$.quantity": quantity } },
        { new: true },
      );
    }

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message:
          quantity === 0
            ? "Cart is empty or product not in cart"
            : "Product not found in cart",
      });
    }

    // Populate product and category
    cart = await cart.populate({
      path: "items.product",
      populate: { path: "category", select: "title" },
    });

    const updatedItem = cart.items.find(
      (item) => item.product._id.toString() === product.toString(),
    );

    res.status(200).json({
      status: "success",
      data: quantity === 0 ? null : formatCartItem(updatedItem),
      message:
        quantity == productDoc.stock
          ? `Only ${productDoc.stock} items available`
          : "Added Successfully",
    });
  }),

  removeFromCart: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { id: productId } = req.params;

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } } },
      { new: true },
    );

    if (!cart) {
      return res
        .status(404)
        .json({ status: "error", message: "Cart not found" });
    }

    return res.status(204).send();
  }),

  clearCart: catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true },
    );

    if (!cart) {
      return res
        .status(404)
        .json({ status: "error", message: "Cart not found" });
    }

    return res.status(204).send();
  }),
};

export default CartController;
