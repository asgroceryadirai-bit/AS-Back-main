import * as paymentLogService from '../services/paymentLogService.js';
import { PaymentLog } from '../models/PaymentLog.js';
import { generateExcelFromPayments } from '../utils/exportUtils.js';
import { Order } from '../models/Order.js';
import { Membership } from '../models/Membership.js';

export const createLog = async (req, res) => {
  try {
    const entry = await paymentLogService.createPaymentLog(req.body);
    res.json(entry);
  } catch (err) {
    console.error('Create payment log failed:', err);
    res.status(500).json({ error: 'Failed to create payment log' });
  }
};

export const listLogs = async (req, res) => {
  try {
    const { search, status, from, to, page, limit, sort } = req.query;
    const result = await paymentLogService.queryPaymentLogs({ search, status, from, to, page, limit, sort });
    res.json({ success: true, total: result.total, items: result.docs });
  } catch (err) {
    console.error('List payment logs failed:', err);
    res.status(500).json({ error: 'Failed to list payment logs' });
  }
};


export const exportExcel = async (req, res) => {
  try {
    const { search, status, from, to, sort } = req.query;
    const docs = await paymentLogService.fetchAllForExport({ search, status, from, to, sort });
    const xlsxBuffer = await generateExcelFromPayments(docs);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payment-log.xlsx"');
    res.send(xlsxBuffer);
  } catch (err) {
    console.error('Export Excel failed:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
};

export const syncFromOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).lean().exec();
    let created = 0;
    for (const o of orders) {
      const orderId = o.id || (o._id && o._id.toString());
      if (!orderId) continue;
      const exists = await PaymentLog.findOne({ orderId }).lean().exec();
      if (exists) continue;
      const bookNames = (o.items || []).map(i => i.product?.name || '').filter(Boolean);
      const entry = new PaymentLog({
        customerName: `${o.billingDetails?.firstName || ''} ${o.billingDetails?.lastName || ''}`.trim() || 'Guest',
        customerId: o.userId || '',
        bookNames,
        orderId,
        paymentId: o.razorpayPaymentId || '',
        razorpayOrderId: o.razorpayOrderId || '',
        paymentStatus: (o.status === 'completed' || o.status === 'paid' || o.status === 'processing') ? 'Paid' : (o.status || 'pending'),
        amount: o.total || 0,
        currency: 'INR',
        paymentMethod: o.paymentMethod || 'Online Payment',
        customerEmail: o.billingDetails?.email || '',
        customerPhone: o.billingDetails?.phone || '',
        notes: o.orderNotes || '',
        source: 'Website Book Purchase',
        createdAt: o.createdAt || new Date(),
        meta: { migratedFromOrder: true }
      });
      await entry.save();
      created += 1;
    }

    // Sync all Membership Subscription purchases
    const memberships = await Membership.find({}).lean().exec();
    for (const mem of memberships) {
      const memId = mem._id ? mem._id.toString() : '';
      if (!memId) continue;
      const pName = mem.planName || (mem.plan ? `${mem.plan.toUpperCase()} PLAN` : 'MEMBERSHIP PLAN');

      let exists = await PaymentLog.findOne({ orderId: memId }).exec();
      if (exists) {
        // Strip out legacy MS- IDs from existing logs if present
        if (exists.bookNames && exists.bookNames.some(b => String(b).includes('(MS-'))) {
          exists.bookNames = exists.bookNames.map(b => String(b).replace(/\s*\(MS-.*?\)/gi, ''));
          exists.notes = (exists.notes || '').replace(/\s*\(MS-.*?\)/gi, '');
          await exists.save();
        }
        continue;
      }

      const entry = new PaymentLog({
        customerName: mem.userName || 'Member',
        customerId: mem.userId || '',
        bookNames: [pName],
        orderId: memId,
        paymentId: mem.razorpayPaymentId || mem.paymentId || 'Online Payment',
        razorpayOrderId: mem.razorpayOrderId || '',
        paymentStatus: (mem.status === 'active' || mem.status === 'completed' || mem.status === 'paid') ? 'Paid' : (mem.status || 'Pending'),
        amount: mem.amount || 0,
        currency: 'INR',
        paymentMethod: 'Online Payment',
        customerEmail: mem.userEmail || '',
        customerPhone: mem.phone || '',
        notes: `Membership Subscription: ${pName}`,
        source: 'Membership Subscription',
        createdAt: mem.startDate || mem.createdAt || new Date(),
        meta: { migratedFromMembership: true }
      });
      await entry.save();
      created += 1;
    }

    res.json({ success: true, created });
  } catch (err) {
    console.error('Sync from orders/memberships failed:', err);
    res.status(500).json({ error: 'Failed to sync from orders and memberships' });
  }
};
