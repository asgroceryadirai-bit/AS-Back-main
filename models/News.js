import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  newsDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  socialLinks: {
  type: [{
    platform: String,
    url: String
  }],
  default: []
}
}, { timestamps: true });

export default mongoose.model('News', newsSchema);