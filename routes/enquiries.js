import express from 'express';
import Enquiry from '../models/Enquiry.js';
import { sendEnquiryNotificationToAdmin, sendEnquiryAcknowledgementToCustomer } from '../services/emailService.js';

const router = express.Router();

// GET all enquiries (for future admin dashboard page)
router.get('/', async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create a new enquiry
router.post('/', async (req, res) => {
  try {
    const { name, email, whatsapp, message, userId } = req.body;
    if (!name || !email || !whatsapp || !message) {
      return res.status(400).json({ error: 'All fields (name, email, whatsapp, message) are required' });
    }

    // Generate a sequential enquiry number starting with 0001
    const lastEnquiryWithNumber = await Enquiry.findOne({ 
      enquiryNumber: { $exists: true, $ne: "", $ne: null } 
    }).sort({ enquiryNumber: -1 }).exec();

    let nextNum = 1;
    if (lastEnquiryWithNumber && lastEnquiryWithNumber.enquiryNumber) {
      const lastNum = parseInt(lastEnquiryWithNumber.enquiryNumber, 10);
      if (!isNaN(lastNum)) {
        nextNum = Math.max(lastNum + 1, 1);
      }
    }
    const enquiryNumber = String(nextNum).padStart(4, '0');

    const enquiry = new Enquiry({
      name,
      email,
      whatsapp,
      message,
      userId,
      enquiryNumber
    });

    const saved = await enquiry.save();

    // Trigger emails async to prevent blocking response
    try {
      await sendEnquiryNotificationToAdmin(saved);
      await sendEnquiryAcknowledgementToCustomer(saved);
    } catch (emailErr) {
      console.error("Error sending enquiry emails:", emailErr);
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update status (replied, closed)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'replied', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const updated = await Enquiry.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!updated) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE an enquiry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Enquiry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Enquiry not found' });
    res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
