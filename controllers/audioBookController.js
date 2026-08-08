import * as audioBookService from "../services/audioBookService.js";

export const getAudioBookReviews = async (req, res) => {
  try {
    const reviews = await audioBookService.fetchAudioBookReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching audio book reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const addAudioBookReview = async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "Please log in to submit a review" });
    }

    const updatedAudioBook = await audioBookService.addAudioBookReview(req.params.id, {
      userId,
      userName,
      rating,
      comment,
    });

    if (!updatedAudioBook) {
      return res.status(404).json({ error: "Audio book not found" });
    }

    res.status(201).json(updatedAudioBook);
  } catch (error) {
    console.error("Error adding audio book review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
};

// GET all audio books (with search & category filter support)
export const getAudioBooks = async (req, res) => {
  try {
    const { category, search, limit, fields } = req.query;
    const audioBooks = await audioBookService.queryAudioBooks({ category, search, limit, fields });
    res.json(audioBooks);
  } catch (error) {
    console.error("Error fetching audio books:", error);
    res.status(500).json({ error: "Failed to fetch audio books" });
  }
};

// GET single audio book
export const getAudioBookById = async (req, res) => {
  try {
    const audioBook = await audioBookService.fetchAudioBookById(req.params.id);
    if (!audioBook) {
      return res.status(404).json({ error: "Audio book not found" });
    }
    res.json(audioBook);
  } catch (error) {
    console.error("Error fetching audio book:", error);
    res.status(500).json({ error: "Failed to fetch audio book" });
  }
};

// POST create audio book
export const createAudioBook = async (req, res) => {
  try {
    const newAudioBook = await audioBookService.addNewAudioBook(req.body);
    res.status(201).json(newAudioBook);
  } catch (error) {
    console.error("Error creating audio book:", error);
    res.status(500).json({ error: "Failed to create audio book" });
  }
};

// PUT update audio book
export const updateAudioBook = async (req, res) => {
  try {
    const updatedAudioBook = await audioBookService.modifyAudioBook(req.params.id, req.body);
    if (!updatedAudioBook) {
      return res.status(404).json({ error: "Audio book not found" });
    }
    res.json(updatedAudioBook);
  } catch (error) {
    console.error("Error updating audio book:", error);
    res.status(500).json({ error: "Failed to update audio book" });
  }
};

// DELETE audio book
export const deleteAudioBook = async (req, res) => {
  try {
    const deletedAudioBook = await audioBookService.removeAudioBook(req.params.id);
    if (!deletedAudioBook) {
      return res.status(404).json({ error: "Audio book not found" });
    }
    res.json({ success: true, message: "Audio book deleted successfully" });
  } catch (error) {
    console.error("Error deleting audio book:", error);
    res.status(500).json({ error: "Failed to delete audio book" });
  }
};

// POST bulk delete audio books
export const bulkDeleteAudioBooks = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid or missing audio book IDs array" });
    }
    const result = await audioBookService.removeMultipleAudioBooks(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} audio book(s) from catalog.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error bulk deleting audio books:", error);
    res.status(500).json({ error: "Failed to bulk delete audio books" });
  }
};
