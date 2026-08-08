import * as eBookService from "../services/eBookService.js";

export const getEBookReviews = async (req, res) => {
  try {
    const reviews = await eBookService.fetchEBookReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching e-book reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const addEBookReview = async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "Please log in to submit a review" });
    }

    const updatedEBook = await eBookService.addEBookReview(req.params.id, {
      userId,
      userName,
      rating,
      comment,
    });

    if (!updatedEBook) {
      return res.status(404).json({ error: "E-book not found" });
    }

    res.status(201).json(updatedEBook);
  } catch (error) {
    console.error("Error adding e-book review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
};

// GET all e-books (with search & category filter support)
export const getEBooks = async (req, res) => {
  try {
    const { category, search, limit, fields } = req.query;
    const ebooks = await eBookService.queryEBooks({ category, search, limit, fields });
    res.json(ebooks);
  } catch (error) {
    console.error("Error fetching e-books:", error);
    res.status(500).json({ error: "Failed to fetch e-books" });
  }
};

// GET single e-book
export const getEBookById = async (req, res) => {
  try {
    const ebook = await eBookService.fetchEBookById(req.params.id);
    if (!ebook) {
      return res.status(404).json({ error: "E-book not found" });
    }
    res.json(ebook);
  } catch (error) {
    console.error("Error fetching e-book:", error);
    res.status(500).json({ error: "Failed to fetch e-book" });
  }
};

// POST create e-book
export const createEBook = async (req, res) => {
  try {
    const newEBook = await eBookService.addNewEBook(req.body);
    res.status(201).json(newEBook);
  } catch (error) {
    console.error("Error creating e-book:", error);
    res.status(500).json({ error: "Failed to create e-book" });
  }
};

// PUT update e-book
export const updateEBook = async (req, res) => {
  try {
    const updatedEBook = await eBookService.modifyEBook(req.params.id, req.body);
    if (!updatedEBook) {
      return res.status(404).json({ error: "E-book not found" });
    }
    res.json(updatedEBook);
  } catch (error) {
    console.error("Error updating e-book:", error);
    res.status(500).json({ error: "Failed to update e-book" });
  }
};

// DELETE e-book
export const deleteEBook = async (req, res) => {
  try {
    const deletedEBook = await eBookService.removeEBook(req.params.id);
    if (!deletedEBook) {
      return res.status(404).json({ error: "E-book not found" });
    }
    res.json({ success: true, message: "E-book deleted successfully" });
  } catch (error) {
    console.error("Error deleting e-book:", error);
    res.status(500).json({ error: "Failed to delete e-book" });
  }
};

// POST bulk delete e-books
export const bulkDeleteEBooks = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid or missing e-book IDs array" });
    }
    const result = await eBookService.removeMultipleEBooks(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} e-book(s) from catalog.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error bulk deleting e-books:", error);
    res.status(500).json({ error: "Failed to bulk delete e-books" });
  }
};
