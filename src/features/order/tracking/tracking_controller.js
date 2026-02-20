import { TrackingItem } from "./tracking_model.js";

const TrackingController = {
  // Get all tracking items
  getAllTrackingItems: async (_req, res) => {
    try {
      const trackingItems = await TrackingItem.find().sort({ createdAt: -1 });

      res.status(200).json({
        count: trackingItems.length,
        trackingItems,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get tracking info for a specific order product
  getOrderProductTracking: async (req, res) => {
    const { orderId, productId } = req.params;

    try {
      const order = await Order.findById(orderId).populate(
        "user shippingAddress",
      );
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const trackingItem = await TrackingItem.findOne({ orderId, productId });
      if (!trackingItem) {
        return res
          .status(404)
          .json({ message: "Tracking item not found for this product" });
      }

      res.status(200).json({
        orderId: order._id,
        trackingId: trackingItem._id,
        productId: trackingItem.productId,
        name: trackingItem.name,
        quantity: trackingItem.quantity,
        orderItemStatus: trackingItem.orderItemStatus,
        statusDates: trackingItem.statusDates,
        expectedDelivery: trackingItem.expectedDelivery,
        image: trackingItem.image || null, // returns empty string if image not set
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateProductStatus: async (req, res) => {
    const { trackingId } = req.params;
    const { orderItemStatus } = req.body;

    const statusFlow = ["orderPlaced", "inProgress", "shipped", "delivered"];

    if (!statusFlow.includes(orderItemStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    try {
      const trackingItem = await TrackingItem.findById(trackingId);
      if (!trackingItem) {
        return res.status(404).json({ message: "Tracking item not found" });
      }

      const currentIndex = statusFlow.indexOf(trackingItem.orderItemStatus);
      const newIndex = statusFlow.indexOf(orderItemStatus);

      if (currentIndex === newIndex) {
        return res.status(400).json({
          message: `Order is already in '${orderItemStatus}' status`,
        });
      }

      // ✅ Allow only one-step forward or backward
      if (Math.abs(newIndex - currentIndex) !== 1) {
        return res.status(400).json({
          message: "Status can only move one step forward or backward",
        });
      }

      // Update tracking item status
      trackingItem.orderItemStatus = orderItemStatus;
      await trackingItem.save();

      // If delivered, check if all products are delivered to complete order
      if (orderItemStatus === "delivered") {
        const orderTrackingItems = await TrackingItem.find({
          orderId: trackingItem.orderId,
        });

        const allDelivered = orderTrackingItems.every(
          (item) => item.orderItemStatus === "delivered",
        );

        if (allDelivered) {
          await Order.findByIdAndUpdate(trackingItem.orderId, {
            status: "completed",
          });
        }
      }

      res.status(200).json({
        message: "Product status updated successfully",
        trackingItem,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

export default TrackingController;
