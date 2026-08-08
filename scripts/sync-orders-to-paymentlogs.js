import dotenv from 'dotenv';
import { connectToMongoDB } from '../config/db.js';
import { Order } from '../models/Order.js';
import { PaymentLog } from '../models/PaymentLog.js';

dotenv.config();

async function main() {
  await connectToMongoDB();
  console.log('Connected. Scanning orders...');

  const orders = await Order.find({}).lean().exec();
  console.log(`Found ${orders.length} orders`);

  let created = 0;
  for (const o of orders) {
    try {
      const orderId = o.id || o._id?.toString();
      const exists = await PaymentLog.findOne({ orderId }).lean().exec();
      if (exists) continue;

      const bookNames = (o.items || []).map(i => i.product?.name || '').filter(Boolean);
      const entry = new PaymentLog({
        customerName: `${o.billingDetails?.firstName || ''} ${o.billingDetails?.lastName || ''}`.trim(),
        customerId: o.userId || '',
        bookNames,
        orderId,
        paymentId: o.razorpayPaymentId || '',
        razorpayOrderId: o.razorpayOrderId || '',
        paymentStatus: (o.status === 'completed' || o.status === 'paid' || o.status === 'processing') ? 'Paid' : (o.status || 'pending'),
        amount: o.total || 0,
        currency: 'INR',
        paymentMethod: o.paymentMethod || '',
        customerEmail: o.billingDetails?.email || '',
        customerPhone: o.billingDetails?.phone || '',
        notes: o.orderNotes || '',
        source: 'Website Book Purchase',
        meta: { migratedFromOrder: true }
      });
      await entry.save();
      created += 1;
    } catch (err) {
      console.error('Error migrating order', o._id, err.message || err);
    }
  }

  console.log(`Migration complete. Created ${created} payment log entries.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
