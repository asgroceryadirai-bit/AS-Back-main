import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: "" },
    email: { type: String, default: "", index: true },
    defaultAddress: { type: String, default: "" },
    city: { type: String, default: "Adirampattinam" },
    photoURL: { type: String, default: "" },
    phoneNumber: { type: String, default: "", index: true },
    authProvider: { type: String, default: "phone" },
    lastLoginAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
