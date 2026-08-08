import express from 'express';
import { getAllNews, getNewsById, createNews, deleteNews, updateNews } from '../controllers/newsController.js';
import upload from '../middlewares/upload.js'; // Uses your Cloudinary storage configuration

const router = express.Router();

router.get('/', getAllNews);

router.get('/:id', getNewsById);
router.post('/', upload.single('image'), createNews);
router.put('/:id', upload.single('image'), updateNews);
router.delete('/:id', deleteNews);

export default router;