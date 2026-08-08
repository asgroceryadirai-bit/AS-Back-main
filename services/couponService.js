import { Coupon } from '../models/Coupon.js';

const normalizeText = (value = '') => String(value || '').trim().toLowerCase();

export const listCoupons = async () => {
  return await Coupon.find({}).sort({ createdAt: -1 }).exec();
};

export const getCouponByCode = async (code) => {
  if (!code) return null;
  return await Coupon.findOne({ code: String(code).trim().toUpperCase() }).exec();
};

export const createCoupon = async (payload) => {
  const coupon = new Coupon({
    ...payload,
    code: String(payload.code || '').trim().toUpperCase(),
  });
  return await coupon.save();
};

export const updateCoupon = async (id, payload) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) return null;

  if (payload.code) {
    coupon.code = String(payload.code).trim().toUpperCase();
  }

  Object.keys(payload).forEach((key) => {
    if (key === 'code') return;
    coupon[key] = payload[key];
  });

  return await coupon.save();
};

export const deleteCoupon = async (id) => {
  return await Coupon.findByIdAndDelete(id);
};

export const validateCouponForCart = async ({ code, cart = [], userId = '', subtotal = 0, isDigitalOnly = false, shippingAddress = {} }) => {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    return { valid: false, message: 'Coupon code is invalid.' };
  }

  if (!coupon.isActive) {
    return { valid: false, message: 'This coupon is no longer active.' };
  }

  if (coupon.expiryDate) {
    const expDate = new Date(coupon.expiryDate);
    expDate.setHours(23, 59, 59, 999);
    if (expDate < new Date()) {
      return { valid: false, message: 'This coupon has expired.' };
    }
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit.' };
  }

  if (coupon.usageLimitPerUser > 0 && userId) {
    const userUsageCount = (coupon.usedBy || []).filter((id) => String(id) === String(userId)).length;
    if (userUsageCount >= coupon.usageLimitPerUser) {
      return { valid: false, message: `You have already used this coupon the maximum allowed times (${coupon.usageLimitPerUser}).` };
    }
  }

  if (Number(subtotal) < Number(coupon.minimumSpend || 0)) {
    return { valid: false, message: `Minimum spend of ₹${Number(coupon.minimumSpend || 0)} required.` };
  }

  if (coupon.maximumSpend !== null && coupon.maximumSpend !== undefined && Number(subtotal) > Number(coupon.maximumSpend)) {
    return { valid: false, message: `Coupon cannot be used above ₹${Number(coupon.maximumSpend || 0)}.` };
  }

  const getItemDescriptors = (item) => {
    const p = item?.product || item || {};
    return [
      p.category,
      p.subCategory,
      p.type,
      p.format,
      p.fileFormat,
      p.name,
      item?.category
    ]
      .filter(Boolean)
      .map(normalizeText);
  };

  const isCategoryMatch = (itemDescriptors, targetCategory) => {
    const targetNorm = normalizeText(targetCategory).replace(/[\s-]/g, '');
    if (!targetNorm) return false;

    return itemDescriptors.some((desc) => {
      const descClean = desc.replace(/[\s-]/g, '');

      // 1. Audiobooks: matches all language audiobooks
      if (targetNorm === 'audiobooks' || targetNorm === 'audiobook' || targetNorm === 'audio') {
        return descClean.includes('audio');
      }

      // 2. E-Books: matches all language e-books
      if (targetNorm === 'ebooks' || targetNorm === 'ebook') {
        return descClean.includes('ebook') || descClean.includes('pdf');
      }

      // 3. EPubs: matches all language epubs
      if (targetNorm === 'epubs' || targetNorm === 'epub') {
        return descClean.includes('epub');
      }

      // 4. Membership: matches membership plans
      if (targetNorm === 'membership' || targetNorm === 'memberships') {
        return descClean.includes('membership');
      }

      // 5. Books: matches all physical books across all languages (Tamil, English, Arabic, Urdu, etc.)
      if (targetNorm === 'books' || targetNorm === 'book') {
        const isDigitalOrMembership = descClean.includes('audio') || descClean.includes('ebook') || descClean.includes('epub') || descClean.includes('membership');
        if (!isDigitalOrMembership) return true;
        if (descClean.includes('book') && !descClean.includes('audio') && !descClean.includes('ebook') && !descClean.includes('epub')) return true;
      }

      // 6. Direct / Substring fallback match
      if (descClean === targetNorm) return true;
      if (descClean.includes(targetNorm) || targetNorm.includes(descClean)) return true;

      return false;
    });
  };

  if (coupon.applicableCategories?.length > 0) {
    const hasApplicableItem = cart.some((item) => {
      const descriptors = getItemDescriptors(item);
      return coupon.applicableCategories.some((allowedCategory) =>
        isCategoryMatch(descriptors, allowedCategory)
      );
    });

    if (!hasApplicableItem) {
      return { valid: false, message: 'This coupon is not valid for the items in your cart.' };
    }
  }

  if (coupon.excludedCategories?.length > 0) {
    const hasExcludedItem = cart.some((item) => {
      const descriptors = getItemDescriptors(item);
      return coupon.excludedCategories.some((excludedCategory) =>
        isCategoryMatch(descriptors, excludedCategory)
      );
    });

    if (hasExcludedItem) {
      return { valid: false, message: 'This coupon cannot be used with the items in your cart.' };
    }
  }

  if (coupon.individualUseOnly && cart.length > 1) {
    return { valid: false, message: 'This coupon can only be used alone in a purchase.' };
  }

  const shippingCountry = normalizeText(shippingAddress?.country || '');
  if (coupon.allowFreeShipping && shippingCountry && shippingCountry !== 'india') {
    return { valid: false, message: 'Free shipping coupons are only available for Indian orders.' };
  }

  if (coupon.type === 'percentage') {
    const discount = subtotal * (Number(coupon.value || 0) / 100);
    return { valid: true, coupon, discount, allowFreeShipping: Boolean(coupon.allowFreeShipping), message: 'Coupon applied successfully.' };
  }

  const discount = Number(coupon.value || 0);
  return { valid: true, coupon, discount, allowFreeShipping: Boolean(coupon.allowFreeShipping), message: 'Coupon applied successfully.' };
};

export const markCouponAsUsed = async ({ code, userId = '' }) => {
  const coupon = await getCouponByCode(code);
  if (!coupon) return null;

  coupon.usedCount = Number(coupon.usedCount || 0) + 1;
  if (userId) {
    coupon.usedBy.push(String(userId));
  }
  return await coupon.save();
};
