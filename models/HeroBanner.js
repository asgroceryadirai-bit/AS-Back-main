import mongoose from 'mongoose';

const heroBannerSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  heading: {
    type: String,
    required: true,
    trim: true,
  },
  subheading: {
    type: String,
    required: true,
    trim: true,
  },
  buttonText: {
    type: String,
    default: 'Shop Now',
    trim: true,
  },
  link: {
    type: String,
    default: '/categories',
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: false,
  }
}, { timestamps: true });

const HeroBanner = mongoose.model('HeroBanner', heroBannerSchema);
export default HeroBanner;