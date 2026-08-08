import express from 'express';
import * as paymentLogController from '../controllers/paymentLogController.js';

const router = express.Router();

router.get('/', paymentLogController.listLogs);
router.post('/', paymentLogController.createLog);
router.post('/sync', paymentLogController.syncFromOrders);
// PDF export removed per admin request
router.get('/export/excel', paymentLogController.exportExcel);

export default router;
