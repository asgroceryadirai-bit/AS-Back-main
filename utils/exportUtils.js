import * as XLSX from 'xlsx';

export const generateExcelFromPayments = async (docs) => {
  const headers = ['S.No', 'Date', 'TIME', 'Customer', 'Customer ID', 'Email', 'Phone Number', 'Books', 'Payment ID', 'Razorpay Order ID', 'Amount', 'Status', 'Method'];
  const rows = docs.map((r, idx) => {
    const dt = r.createdAt ? new Date(r.createdAt) : null;
    return [
      idx + 1,
      dt ? dt.toLocaleDateString('en-GB') : '',
      dt ? dt.toLocaleTimeString('en-GB') : '',
      r.customerName || '',
      r.customerId || '',
      r.customerEmail || '',
      r.customerPhone || '',
      (r.bookNames || []).join(', '),
      r.paymentId || '',
      r.razorpayOrderId || '',
      r.amount || 0,
      r.paymentStatus || '',
      r.paymentMethod || ''
    ];
  });

  const worksheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PaymentLog');
  const writeResult = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return Buffer.isBuffer(writeResult) ? writeResult : Buffer.from(writeResult);
};
