import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  product: { type: mongoose.Schema.Types.Mixed, required: true },
});

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "on-hold", "cancelled", "refunded", "failed", "paid"],
      default: "pending",
    },
    trackingId: { type: String },
    trackingNumber: { type: String, default: "" },
    trackingSubmittedAt: { type: Date },
    
    // Billing Details
    billingDetails: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      companyName: { type: String, default: "" },
      country: { type: String, default: "" },
      streetAddress1: { type: String, default: "" },
      streetAddress2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pinCode: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    
    // Shipping Details
    shippingDetails: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      country: { type: String, default: "" },
      streetAddress1: { type: String, default: "" },
      streetAddress2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pinCode: { type: String, default: "" },
      orderNotes: { type: String, default: "" },
    },
    
    // Additional notes/metadata
    orderNotes: { type: String, default: "" },
    couponCode: { type: String, default: "" },
    orderNumber: { type: String, default: "" },
    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    membershipDiscount: { type: Number, default: 0 },
    membershipPlan: { type: String, default: "" },
    paymentMethod: { type: String, default: "Online" },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    customerIp: { type: String, default: "" },
    
    // WooCommerce-style logs/notes
    statusHistory: [
      {
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String },
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Duplicate the ID field.
OrderSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialised.
OrderSchema.set("toJSON", {
  virtuals: true,
});

export const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
