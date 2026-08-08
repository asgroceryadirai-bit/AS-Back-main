import { PaymentLog } from '../models/PaymentLog.js';

export const createPaymentLog = async (data) => {
  const entry = new PaymentLog(data);
  return await entry.save();
};

export const queryPaymentLogs = async ({ search, status, from, to, page = 1, limit = 50, sort = '-createdAt' }) => {
  const filter = {};
  if (status && status !== 'all') {
    // Case-insensitive match for status values
    filter.paymentStatus = { $regex: `^${String(status)}$`, $options: 'i' };
  }

  if (search) {
    const s = String(search);
    filter.$or = [
      { customerName: { $regex: s, $options: 'i' } },
      { customerId: { $regex: s, $options: 'i' } },
      { paymentId: { $regex: s, $options: 'i' } },
      { razorpayOrderId: { $regex: s, $options: 'i' } },
      { paymentMethod: { $regex: s, $options: 'i' } },
      { bookNames: { $regex: s, $options: 'i' } }
    ];
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      // include the entire 'to' day by setting time to end of day
      const d = new Date(to);
      d.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = d;
    }
  }

  const skip = Math.max(0, (Number(page) - 1) * Number(limit));
  const docs = await PaymentLog.find(filter).sort(sort).skip(skip).limit(Number(limit)).exec();
  const total = await PaymentLog.countDocuments(filter);
  return { docs, total };
};

export const fetchAllForExport = async ({ search, status, from, to, sort = '-createdAt' }) => {
  const res = await queryPaymentLogs({ search, status, from, to, page: 1, limit: 10000, sort });
  return res.docs;
};
