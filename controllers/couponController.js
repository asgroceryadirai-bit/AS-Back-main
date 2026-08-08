import * as couponService from '../services/couponService.js';

export const getCoupons = async (req, res) => {
  try {
    const coupons = await couponService.listCoupons();
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await couponService.deleteCoupon(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const result = await couponService.validateCouponForCart({
      code: req.body?.code,
      cart: req.body?.cart || [],
      userId: req.body?.userId || '',
      subtotal: req.body?.subtotal || 0,
      isDigitalOnly: req.body?.isDigitalOnly || false,
      shippingAddress: req.body?.shippingAddress || {},
    });
    res.json(result);
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
};
