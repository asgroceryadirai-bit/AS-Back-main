import mongoose from 'mongoose';

const PaymentLogSchema = new mongoose.Schema({
  customerName: { type: String, default: '' },
  customerId: { type: String, default: '' },
  bookNames: { type: [String], default: [] },
  orderId: { type: String, default: '' },
  paymentId: { type: String, default: '' },
  razorpayOrderId: { type: String, default: '' },
  paymentStatus: { type: String, default: 'pending' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  notes: { type: String, default: '' },
  source: { type: String, default: 'Website Book Purchase' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Use explicit collection name with space as requested
export const PaymentLog = mongoose.models.PaymentLog || mongoose.model('PaymentLog', PaymentLogSchema, 'payment log');
