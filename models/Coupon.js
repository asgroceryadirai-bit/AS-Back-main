import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: { type: String, trim: true, default: "" },
    type: {
      type: String,
      enum: ["amount", "percentage"],
      default: "amount",
    },
    value: { type: Number, required: true, min: 0, default: 0 },
    allowFreeShipping: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
    minimumSpend: { type: Number, default: 0, min: 0 },
    maximumSpend: { type: Number, default: null },
    individualUseOnly: { type: Boolean, default: false },
    applicableCategories: [{ type: String, trim: true }],
    excludedCategories: [{ type: String, trim: true }],
    usageLimit: { type: Number, default: 0, min: 0 },
    usageLimitPerUser: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    usedCount: { type: Number, default: 0, min: 0 },
    usedBy: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

CouponSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

CouponSchema.set("toJSON", {
  virtuals: true,
});

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
