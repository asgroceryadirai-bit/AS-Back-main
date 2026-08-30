// Telegram Notification Service for AS Grocery Order Alerts

/**
 * Send real-time Telegram notification to the store admin whenever an order is placed.
 * @param {Object} order - The saved order document from MongoDB
 */
export const sendTelegramOrderAlert = async (order) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!botToken || !chatId) {
    console.log('ℹ️ Telegram notifications disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured in .env');
    return;
  }

  // Ensure Telegram supergroup/channel IDs have the required minus sign
  if (chatId.startsWith('100') && !chatId.startsWith('-')) {
    chatId = `-${chatId}`;
  }

  try {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsList = items
      .map((item, idx) => {
        const pName = item.product?.name || item.name || 'Grocery Item';
        const pPrice = Number(item.product?.price || item.price || 0);
        const pQty = Number(item.quantity || 1);
        const pUnit = item.product?.unit || item.product?.subCategory || '';
        const unitText = pUnit ? ` (${pUnit})` : '';
        return `  <b>${idx + 1}.</b> ${pName}${unitText} × <b>${pQty}</b> — ₹${(pPrice * pQty).toFixed(2)}`;
      })
      .join('\n');

    const customerName = `${order.billingDetails?.firstName || 'Customer'} ${order.billingDetails?.lastName || ''}`.trim();
    const phone = order.billingDetails?.phone || 'Not provided';
    const address = order.shippingAddress || `${order.billingDetails?.streetAddress1 || ''}, ${order.billingDetails?.city || ''}`;
    const total = Number(order.total || 0).toFixed(2);
    const orderNum = order.orderNumber || order.id?.slice(-6).toUpperCase() || order._id?.slice(-6).toUpperCase();
    const notes = order.orderNotes ? `\n\n📝 <b>Delivery Note:</b> <i>${order.orderNotes}</i>` : '';

    const message = `🛒 <b>NEW AS GROCERY ORDER RECEIVED!</b>
━━━━━━━━━━━━━━━━━━━━━━
📦 <b>Order ID:</b> <code>#${orderNum}</code>
👤 <b>Customer:</b> ${customerName}
📞 <b>Phone:</b> <code>${phone}</code>
📍 <b>Delivery Address:</b>
${address}

🛍️ <b>Items Ordered:</b>
${itemsList || '  (No items)'}

🚚 <b>Delivery Fee:</b> ${order.shipping === 0 ? 'FREE' : '₹' + order.shipping}
💰 <b>Total Bill:</b> <b>₹${total}</b>
💳 <b>Payment Method:</b> <b>${order.paymentMethod || 'Cash on Delivery'}</b>${notes}
━━━━━━━━━━━━━━━━━━━━━━
⏰ <i>Placed on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const resData = await response.json();
    if (resData.ok) {
      console.log(`✅ Telegram order alert sent to admin for order #${orderNum}!`);
    } else {
      console.error('❌ Telegram API error:', resData.description);
    }
  } catch (err) {
    console.error('❌ Failed to send Telegram alert:', err);
  }
};
