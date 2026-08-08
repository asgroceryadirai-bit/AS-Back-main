import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    membershipNumber: { type: String, default: '' },
    purchaseId: { type: String, default: '' },
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    plan: { type: String, enum: ['silver', 'platinum', 'gold'], required: true },
    planName: { type: String, default: '' },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'failed'],
      default: 'pending',
    },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

export const Membership = mongoose.model('Membership', membershipSchema);
