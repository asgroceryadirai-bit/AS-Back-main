import { Book } from '../models/Book.js';
import { AudioBook } from '../models/AudioBook.js';
import { EBook } from '../models/EBook.js';
import { EPub } from '../models/EPub.js';

const productModels = [Book, AudioBook, EBook, EPub];
const digitalKeywords = ['audio', 'e-book', 'ebook', 'e-pub', 'epub', 'pdf'];

export const isDigitalProductItem = (item = {}) => {
  const product = item.product || {};
  const category = (product.category || '').toLowerCase();
  const format = (product.format || '').toLowerCase();
  const type = (product.type || '').toLowerCase();
  const name = (product.name || product.title || '').toLowerCase();
  const combinedText = `${category} ${format} ${type} ${name}`;
  const hasAudioAssets = Boolean(product.audioTracks?.length || product.audioFiles?.length || product.audioUrl);

  return hasAudioAssets || digitalKeywords.some((keyword) => combinedText.includes(keyword));
};

export const findProductForOrderItem = async (item = {}) => {
  const productId = item.productId || item.product?.id || item.product?._id;
  if (!productId) return null;

  const normalizedId = String(productId);
  for (const Model of productModels) {
    const product = await Model.findById(normalizedId);
    if (product) {
      return { product, modelName: Model.modelName };
    }
  }

  return null;
};

export const getStockAvailabilityForItem = async (item = {}) => {
  if (isDigitalProductItem(item)) {
    return { isDigital: true, available: true };
  }

  const matchedProduct = await findProductForOrderItem(item);
  if (!matchedProduct) {
    return {
      isDigital: false,
      available: false,
      error: 'The selected product could not be found.'
    };
  }

  const stock = Number(matchedProduct.product?.stock ?? 0);
  const requestedQuantity = Number(item.quantity ?? 1);

  if (!Number.isFinite(stock) || stock <= 0) {
    return {
      isDigital: false,
      available: false,
      error: `The selected product is currently out of stock.`
    };
  }

  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return {
      isDigital: false,
      available: false,
      error: 'The requested quantity is invalid.'
    };
  }

  if (requestedQuantity > stock) {
    return {
      isDigital: false,
      available: false,
      error: `Only ${stock} unit${stock === 1 ? '' : 's'} available for the selected product.`
    };
  }

  return {
    isDigital: false,
    available: true,
    stock,
    product: matchedProduct.product
  };
};
