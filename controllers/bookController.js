import * as bookService from "../services/bookService.js";

export const getBookReviews = async (req, res) => {
  try {
    const reviews = await bookService.fetchBookReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching book reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const addBookReview = async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "Please log in to submit a review" });
    }

    const updatedBook = await bookService.addBookReview(req.params.id, {
      userId,
      userName,
      rating,
      comment,
    });

    if (!updatedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(201).json(updatedBook);
  } catch (error) {
    console.error("Error adding book review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
};

// GET all books (with search & category filter support)
export const getBooks = async (req, res) => {
  try {
    const { category, search, limit, fields } = req.query;
    const books = await bookService.queryBooks({ category, search, limit, fields });
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Failed to fetch books" });
  }
};

export const getTopSoldBooks = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 12;
    const books = await bookService.fetchTopSoldBooks(limit);
    res.json(books);
  } catch (error) {
    console.error("Error fetching top sold books:", error);
    res.status(500).json({ error: "Failed to fetch top sold books" });
  }
};


// GET single book
export const getBookById = async (req, res) => {
  try {
    const book = await bookService.fetchBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Failed to fetch book" });
  }
};

// POST create book
export const createBook = async (req, res) => {
  try {
    const newBook = await bookService.addNewBook(req.body);
    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ error: "Failed to create book" });
  }
};

// PUT update book
export const updateBook = async (req, res) => {
  try {
    const updatedBook = await bookService.modifyBook(req.params.id, req.body);
    if (!updatedBook) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(updatedBook);
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
};

// DELETE book
export const deleteBook = async (req, res) => {
  try {
    const deletedBook = await bookService.removeBook(req.params.id);
    if (!deletedBook) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json({ success: true, message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
};

// POST seed catalog books
export const seedBooks = async (req, res) => {
  try {
    const { force } = req.body;
    const result = await bookService.seedCatalog(force);

    if (result.alreadySeeded) {
      return res.json({
        success: false,
        alreadySeeded: true,
        count: result.count,
        message: result.message,
      });
    }

    res.json({
      success: true,
      seededCount: result.seededCount,
      message: result.message,
    });
  } catch (error) {
    console.error("Seeding catalog failed:", error);
    res.status(500).json({ error: "Seeding catalog failed" });
  }
};

// POST bulk delete books
export const bulkDeleteBooks = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid or missing book IDs array" });
    }
    const result = await bookService.removeMultipleBooks(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} publications from catalog.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error bulk deleting books:", error);
    res.status(500).json({ error: "Failed to bulk delete books" });
  }
};



