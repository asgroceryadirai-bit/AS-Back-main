import { Router } from 'express';
import HeroBanner from '../models/HeroBanner.js';
import upload from '../middlewares/upload.js';

const router = Router();

// Get all banners sorted by order
router.get('/', async (req, res) => {
  try {
    const banners = await HeroBanner.find().sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    console.error('Failed to fetch hero banners:', error);
    res.status(500).json({ error: 'Failed to fetch hero banners' });
  }
});

// Get a single banner by ID
router.get('/:id', async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json(banner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hero banner' });
  }
});

// Add a new banner (supports both multipart form with file and JSON)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { heading, subheading, buttonText, link, order, imageUrl: directImageUrl } = req.body;
    
    const imageUrl = req.file ? req.file.path : directImageUrl;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Banner photo / image is required' });
    }
    if (!heading || !subheading) {
      return res.status(400).json({ error: 'Both heading and subheading are required' });
    }

    let finalOrder = typeof order === 'number' ? order : parseInt(order, 10);
    if (isNaN(finalOrder)) {
      const maxOrderBanner = await HeroBanner.findOne().sort('-order');
      finalOrder = maxOrderBanner ? maxOrderBanner.order + 1 : 0;
    }

    const newBanner = new HeroBanner({
      imageUrl,
      heading: heading.trim(),
      subheading: subheading.trim(),
      buttonText: buttonText ? buttonText.trim() : 'Shop Now',
      link: link ? link.trim() : '/categories',
      order: finalOrder,
    });

    const saved = await newBanner.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Failed to create hero banner:', error);
    res.status(500).json({ error: error.message || 'Failed to create hero banner' });
  }
});

// Update an existing banner
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { heading, subheading, buttonText, link, order, imageUrl: directImageUrl } = req.body;
    
    const updateData = {};
    if (req.file) {
      updateData.imageUrl = req.file.path;
    } else if (directImageUrl) {
      updateData.imageUrl = directImageUrl;
    }

    if (heading !== undefined) updateData.heading = heading.trim();
    if (subheading !== undefined) updateData.subheading = subheading.trim();
    if (buttonText !== undefined) updateData.buttonText = buttonText.trim();
    if (link !== undefined) updateData.link = link.trim();
    if (order !== undefined) updateData.order = parseInt(order, 10);

    const updated = await HeroBanner.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Failed to update hero banner:', error);
    res.status(500).json({ error: error.message || 'Failed to update hero banner' });
  }
});

// Reorder banners
router.put('/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    for (const item of items) {
      const bannerId = item.id || item._id;
      if (bannerId && typeof item.order === 'number') {
        await HeroBanner.findByIdAndUpdate(bannerId, { order: item.order });
      }
    }

    res.json({ message: 'Banners reordered successfully' });
  } catch (error) {
    console.error('Failed to reorder hero banners:', error);
    res.status(500).json({ error: 'Failed to reorder hero banners' });
  }
});

// Delete a banner
router.delete('/:id', async (req, res) => {
  try {
    const deletedBanner = await HeroBanner.findByIdAndDelete(req.params.id);
    if (!deletedBanner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Failed to delete hero banner:', error);
    res.status(500).json({ error: 'Failed to delete hero banner' });
  }
});

export default router;