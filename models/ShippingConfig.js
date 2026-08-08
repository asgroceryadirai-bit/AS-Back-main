import mongoose from "mongoose";

const ShippingConfigSchema = new mongoose.Schema(
  {
    group1: { type: Number, default: 30 }, // Tamil Nadu
    group2: { type: Number, default: 30 }, // AP, Karnataka, Kerala, Telungana, Hyderabad & Secunderabad
    group3: { type: Number, default: 30 }, // Delhi, Mumbai, Calicut, North & North East
  },
  { timestamps: true }
);

export const ShippingConfig = mongoose.models.ShippingConfig || mongoose.model("ShippingConfig", ShippingConfigSchema);
