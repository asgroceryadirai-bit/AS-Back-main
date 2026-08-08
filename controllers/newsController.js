import News from '../models/News.js';

export const getAllNews = async (req, res) => {
  try {
    const news = await News.find().sort({ newsDate: -1 });
    res.status(200).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNewsById = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) return res.status(404).json({ error: 'News not found' });
    res.status(200).json(newsItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createNews = async (req, res) => {
  try {
    const { title, content, newsDate } = req.body;
    const imageUrl = req.file ? req.file.path : '';
    
    let socialLinks = [];
    if (req.body.socialLinks) {
      try {
        socialLinks = JSON.parse(req.body.socialLinks);
      } catch (e) {
        console.error("Error parsing socialLinks:", e);
      }
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Cover image is required' });
    }

    const newNews = new News({
      title,
      content,
      imageUrl,
      socialLinks,
      newsDate: newsDate ? new Date(newsDate) : new Date()
    });

    const savedNews = await newNews.save();
    res.status(201).json(savedNews);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const newsItem = await News.findByIdAndDelete(req.params.id);
    if (!newsItem) return res.status(404).json({ error: 'News not found' });
    res.status(200).json({ message: 'News deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { title, content, newsDate } = req.body;
    let updateData = { title, content };
    if (newsDate) updateData.newsDate = new Date(newsDate);

    if (req.body.socialLinks) {
      try {
        updateData.socialLinks = JSON.parse(req.body.socialLinks);
      } catch (e) {
        console.error("Error parsing socialLinks:", e);
      }
    }

    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const updatedNews = await News.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedNews) return res.status(404).json({ error: 'News not found' });
    res.status(200).json(updatedNews);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};