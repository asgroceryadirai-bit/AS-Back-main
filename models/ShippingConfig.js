import mongoose from "mongoose";

const ShippingConfigSchema = new mongoose.Schema(
  {
    shippingFee: { type: Number, default: 30 },
    group1: { type: Number, default: 30 },
    group2: { type: Number, default: 30 },
    group3: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const ShippingConfig = mongoose.models.ShippingConfig || mongoose.model("ShippingConfig", ShippingConfigSchema);
