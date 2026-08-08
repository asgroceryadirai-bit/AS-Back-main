import { Router } from 'express';
import Author from '../models/Author.js';
import { Book } from '../models/Book.js';
import { AudioBook } from '../models/AudioBook.js';
import { EBook } from '../models/EBook.js';
import { EPub } from '../models/EPub.js';

const router = Router();

// Get all authors
router.get('/', async (req, res) => {
  try {
    const authors = await Author.find().sort({ name: 1 });
    res.json(authors);
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

// Get author by id or name
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let author;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      author = await Author.findById(identifier);
    }
    if (!author) {
      const regex = new RegExp(`^${identifier.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      author = await Author.findOne({ name: regex });
    }
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }
    res.json(author);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch author' });
  }
});

// Create or update (upsert) author photo / details
router.post('/', async (req, res) => {
  try {
    const { name, photoUrl, bio, renameCatalogBooks, oldName } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Author name is required' });
    }

    const cleanName = name.trim();
    const targetLookup = (oldName && oldName.trim()) ? oldName.trim() : cleanName;

    // Check if author already exists by case-insensitive name match
    let existing = await Author.findOne({
      name: new RegExp(`^${targetLookup.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i')
    });

    if (existing) {
      existing.name = cleanName;
      if (photoUrl !== undefined) existing.photoUrl = photoUrl;
      if (bio !== undefined) existing.bio = bio;
      await existing.save();

      // Optionally update author name across catalog publications
      if (renameCatalogBooks && oldName && oldName.trim() !== cleanName) {
        await syncAuthorNameInCatalog(oldName.trim(), cleanName);
      }

      return res.json(existing);
    }

    const newAuthor = new Author({
      name: cleanName,
      photoUrl: photoUrl || '',
      bio: bio || '',
    });
    await newAuthor.save();

    if (renameCatalogBooks && oldName && oldName.trim() !== cleanName) {
      await syncAuthorNameInCatalog(oldName.trim(), cleanName);
    }

    res.status(201).json(newAuthor);
  } catch (error) {
    console.error('Error creating author profile:', error);
    res.status(500).json({ error: error.message || 'Failed to save author profile' });
  }
});

// Update author details by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, photoUrl, bio, renameCatalogBooks } = req.body;
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    const oldName = author.name;
    if (name && name.trim()) author.name = name.trim();
    if (photoUrl !== undefined) author.photoUrl = photoUrl;
    if (bio !== undefined) author.bio = bio;

    await author.save();

    if (renameCatalogBooks && oldName && name && oldName.trim() !== name.trim()) {
      await syncAuthorNameInCatalog(oldName.trim(), name.trim());
    }

    res.json(author);
  } catch (error) {
    console.error('Error updating author profile:', error);
    res.status(500).json({ error: 'Failed to update author profile' });
  }
});

// Helper function to sync author name across catalog collections
async function syncAuthorNameInCatalog(oldAuthorName, newAuthorName) {
  try {
    const regex = new RegExp(`\\b${oldAuthorName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'i');
    
    // Update Books
    const books = await Book.find({ author: regex });
    for (const b of books) {
      b.author = b.author.replace(regex, newAuthorName);
      await b.save();
    }

    // Update AudioBooks
    const audioBooks = await AudioBook.find({ author: regex });
    for (const ab of audioBooks) {
      ab.author = ab.author.replace(regex, newAuthorName);
      await ab.save();
    }

    // Update EBooks
    const eBooks = await EBook.find({ author: regex });
    for (const eb of eBooks) {
      eb.author = eb.author.replace(regex, newAuthorName);
      await eb.save();
    }

    // Update EPubs
    const ePubs = await EPub.find({ author: regex });
    for (const ep of ePubs) {
      ep.author = ep.author.replace(regex, newAuthorName);
      await ep.save();
    }
  } catch (e) {
    console.error('Error syncing author name across catalog:', e);
  }
}

// Delete author photo / profile by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Author.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Author record not found' });
    }
    res.json({ message: 'Author record deleted successfully' });
  } catch (error) {
    console.error('Error deleting author record:', error);
    res.status(500).json({ error: 'Failed to delete author record' });
  }
});

export default router;
