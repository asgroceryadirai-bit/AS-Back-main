import { getStockAvailabilityForItem } from '../utils/stockUtils.js';

/**
 * Validation Middleware for books and orders.
 * Intercepts bad or malformed payloads before they reach controllers.
 */

/**
 * Validate book creation/updating payload.
 */
export const validateBookPayload = (req, res, next) => {
  const { name, price, category, stock } = req.body;

  // For POST requests, name, price, and category are strictly required.
  if (req.method === "POST") {
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'name' is required and must be a non-empty string." });
    }
    if (price === undefined || typeof price !== "number" || price < 0) {
      return res.status(400).json({ error: "Validation Failed: 'price' is required and must be a non-negative number." });
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'category' is required and must be a non-empty string." });
    }
  }

  // For PUT / PATCH requests, validate values if they are present.
  if (req.method === "PUT" || req.method === "PATCH") {
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'name' must be a non-empty string if provided." });
    }
    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return res.status(400).json({ error: "Validation Failed: 'price' must be a non-negative number if provided." });
    }
    if (category !== undefined && (typeof category !== "string" || category.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'category' must be a non-empty string if provided." });
    }
  }

  // Stock check (common for POST/PUT)
  if (stock !== undefined && (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ error: "Validation Failed: 'stock' must be a non-negative integer if provided." });
  }

  next();
};

/**
 * Validate audio book creation/updating payload.
 */
export const validateAudioBookPayload = (req, res, next) => {
  const { name, price, category, stock, audioTracks, audioVoiceOver, audioFiles } = req.body;

  // For POST requests, name, price, and category are strictly required.
  if (req.method === "POST") {
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'name' is required and must be a non-empty string." });
    }
    if (price === undefined || typeof price !== "number" || price < 0) {
      return res.status(400).json({ error: "Validation Failed: 'price' is required and must be a non-negative number." });
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'category' is required and must be a non-empty string." });
    }
    if (!audioVoiceOver || typeof audioVoiceOver !== "string" || audioVoiceOver.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'audioVoiceOver' is required and must be a non-empty string." });
    }
    if (!audioFiles || !Array.isArray(audioFiles) || audioFiles.length === 0) {
      return res.status(400).json({ error: "Validation Failed: 'audioFiles' is required and must be a non-empty array." });
    }
  }

  // For PUT / PATCH requests, validate values if they are present.
  if (req.method === "PUT" || req.method === "PATCH") {
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'name' must be a non-empty string if provided." });
    }
    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return res.status(400).json({ error: "Validation Failed: 'price' must be a non-negative number if provided." });
    }
    if (category !== undefined && (typeof category !== "string" || category.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'category' must be a non-empty string if provided." });
    }
    if (audioVoiceOver !== undefined && (typeof audioVoiceOver !== "string" || audioVoiceOver.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'audioVoiceOver' must be a non-empty string if provided." });
    }
    if (audioFiles !== undefined) {
      if (!Array.isArray(audioFiles) || audioFiles.length === 0) {
        return res.status(400).json({ error: "Validation Failed: 'audioFiles' must be a non-empty array if provided." });
      }
    }
  }

  // Stock check (common for POST/PUT)
  if (stock !== undefined && (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ error: "Validation Failed: 'stock' must be a non-negative integer if provided." });
  }

  // Validate audioFiles if provided
  if (audioFiles !== undefined) {
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      if (!file.name || typeof file.name !== "string" || file.name.trim() === "") {
        return res.status(400).json({ error: `Validation Failed: audioFiles[${i}].name is required and must be a non-empty string.` });
      }
      if (!file.url || typeof file.url !== "string" || file.url.trim() === "") {
        return res.status(400).json({ error: `Validation Failed: audioFiles[${i}].url is required and must be a non-empty string.` });
      }
    }
  }

  // Validate audioTracks if provided
  if (audioTracks !== undefined) {
    if (!Array.isArray(audioTracks)) {
      return res.status(400).json({ error: "Validation Failed: 'audioTracks' must be an array." });
    }
    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i];
      if (!track.title || typeof track.title !== "string" || track.title.trim() === "") {
        return res.status(400).json({ error: `Validation Failed: audioTracks[${i}].title is required and must be a non-empty string.` });
      }
      if (!track.url || typeof track.url !== "string" || track.url.trim() === "") {
        return res.status(400).json({ error: `Validation Failed: audioTracks[${i}].url is required and must be a non-empty string.` });
      }
    }
  }

  next();
};

/**
 * Validate e-book creation/updating payload.
 */
export const validateEBookPayload = (req, res, next) => {
  const { name, price, category, stock } = req.body;

  // For POST requests, name, price, and category are strictly required.
  if (req.method === "POST") {
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'name' is required and must be a non-empty string." });
    }
    if (price === undefined || typeof price !== "number" || price < 0) {
      return res.status(400).json({ error: "Validation Failed: 'price' is required and must be a non-negative number." });
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'category' is required and must be a non-empty string." });
    }
  }

  // For PUT / PATCH requests, validate values if they are present.
  if (req.method === "PUT" || req.method === "PATCH") {
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'name' must be a non-empty string if provided." });
    }
    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return res.status(400).json({ error: "Validation Failed: 'price' must be a non-negative number if provided." });
    }
    if (category !== undefined && (typeof category !== "string" || category.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'category' must be a non-empty string if provided." });
    }
  }

  // Stock check (common for POST/PUT)
  if (stock !== undefined && (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ error: "Validation Failed: 'stock' must be a non-negative integer if provided." });
  }

  next();
};

/**
 * Validate e-pub creation/updating payload.
 */
export const validateEPubPayload = (req, res, next) => {
  const { name, price, category, stock } = req.body;

  // For POST requests, name, price, and category are strictly required.
  if (req.method === "POST") {
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'name' is required and must be a non-empty string." });
    }
    if (price === undefined || typeof price !== "number" || price < 0) {
      return res.status(400).json({ error: "Validation Failed: 'price' is required and must be a non-negative number." });
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return res.status(400).json({ error: "Validation Failed: 'category' is required and must be a non-empty string." });
    }
  }

  // For PUT / PATCH requests, validate values if they are present.
  if (req.method === "PUT" || req.method === "PATCH") {
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'name' must be a non-empty string if provided." });
    }
    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return res.status(400).json({ error: "Validation Failed: 'price' must be a non-negative number if provided." });
    }
    if (category !== undefined && (typeof category !== "string" || category.trim() === "")) {
      return res.status(400).json({ error: "Validation Failed: 'category' must be a non-empty string if provided." });
    }
  }

  // Stock check (common for POST/PUT)
  if (stock !== undefined && (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ error: "Validation Failed: 'stock' must be a non-negative integer if provided." });
  }

  next();
};

/**
 * Validate order payload.
 */
export const validateOrderPayload = async (req, res, next) => {
  const { items, total, paymentMethod } = req.body;

  if (req.method === "POST") {
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("Order Validation Failed: 'items' is missing, not an array, or empty.");
      return res.status(400).json({ error: "Validation Failed: 'items' must be a non-empty array." });
    }

    // Validate each cart item
    for (const item of items) {
      // Gracefully resolve and stringify productId to handle legacy localStorage shapes or integer IDs
      let pId = item.productId || item.product?.id || item.product?._id;
      if (pId !== undefined && pId !== null) {
        pId = String(pId);
      }
      item.productId = pId;

      if (!item.productId || typeof item.productId !== "string" || item.productId.trim() === "") {
        console.error("Order Validation Failed: item.productId is invalid. Value:", item.productId, "Type:", typeof item.productId);
        return res.status(400).json({ error: "Validation Failed: Each item must have a valid 'productId' string." });
      }
      if (item.quantity === undefined || typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        console.error("Order Validation Failed: item.quantity is invalid. Value:", item.quantity, "Type:", typeof item.quantity);
        return res.status(400).json({ error: "Validation Failed: Each item 'quantity' must be a positive integer." });
      }
      if (item.product && (item.product.price === undefined || typeof item.product.price !== "number" || item.product.price < 0)) {
        console.error("Order Validation Failed: item.product.price is invalid. Value:", item.product?.price, "Type:", typeof item.product?.price);
        return res.status(400).json({ error: "Validation Failed: Item price must be a non-negative number." });
      }

      const availability = await getStockAvailabilityForItem(item);
      if (!availability.available) {
        return res.status(400).json({ error: availability.error || "One or more items are unavailable for purchase." });
      }
    }

    // NOTE: total is computed on the server to prevent client-side tampering.

    if (paymentMethod && typeof paymentMethod !== "string") {
      console.error("Order Validation Failed: 'paymentMethod' is invalid. Value:", paymentMethod, "Type:", typeof paymentMethod);
      return res.status(400).json({ error: "Validation Failed: 'paymentMethod' must be a string." });
    }
  }

  next();
};
