import * as ePubService from "../services/ePubService.js";

export const getEPubReviews = async (req, res) => {
  try {
    const reviews = await ePubService.fetchEPubReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching e-pub reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const addEPubReview = async (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    if (!userId) {
      return res.status(401).json({ error: "Please log in to submit a review" });
    }

    const updatedEPub = await ePubService.addEPubReview(req.params.id, {
      userId,
      userName,
      rating,
      comment,
    });

    if (!updatedEPub) {
      return res.status(404).json({ error: "E-pub not found" });
    }

    res.status(201).json(updatedEPub);
  } catch (error) {
    console.error("Error adding e-pub review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
};

// GET all e-pubs (with search & category filter support)
export const getEPubs = async (req, res) => {
  try {
    const { category, search, limit, fields } = req.query;
    const epubs = await ePubService.queryEPubs({ category, search, limit, fields });
    res.json(epubs);
  } catch (error) {
    console.error("Error fetching e-pubs:", error);
    res.status(500).json({ error: "Failed to fetch e-pubs" });
  }
};

// GET single e-pub
export const getEPubById = async (req, res) => {
  try {
    const epub = await ePubService.fetchEPubById(req.params.id);
    if (!epub) {
      return res.status(404).json({ error: "E-pub not found" });
    }
    res.json(epub);
  } catch (error) {
    console.error("Error fetching e-pub:", error);
    res.status(500).json({ error: "Failed to fetch e-pub" });
  }
};

// POST create e-pub
export const createEPub = async (req, res) => {
  try {
    const newEPub = await ePubService.addNewEPub(req.body);
    res.status(201).json(newEPub);
  } catch (error) {
    console.error("Error creating e-pub:", error);
    res.status(500).json({ error: "Failed to create e-pub" });
  }
};

// PUT update e-pub
export const updateEPub = async (req, res) => {
  try {
    const updatedEPub = await ePubService.modifyEPub(req.params.id, req.body);
    if (!updatedEPub) {
      return res.status(404).json({ error: "E-pub not found" });
    }
    res.json(updatedEPub);
  } catch (error) {
    console.error("Error updating e-pub:", error);
    res.status(500).json({ error: "Failed to update e-pub" });
  }
};

// DELETE e-pub
export const deleteEPub = async (req, res) => {
  try {
    const deletedEPub = await ePubService.removeEPub(req.params.id);
    if (!deletedEPub) {
      return res.status(404).json({ error: "E-pub not found" });
    }
    res.json({ success: true, message: "E-pub deleted successfully" });
  } catch (error) {
    console.error("Error deleting e-pub:", error);
    res.status(500).json({ error: "Failed to delete e-pub" });
  }
};

// POST bulk delete e-pubs
export const bulkDeleteEPubs = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid or missing e-pub IDs array" });
    }
    const result = await ePubService.removeMultipleEPubs(ids);
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} e-pub(s) from catalog.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error bulk deleting e-pubs:", error);
    res.status(500).json({ error: "Failed to bulk delete e-pubs" });
  }
};
