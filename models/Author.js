import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: '',
  }
}, { timestamps: true });

const Author = mongoose.model('Author', authorSchema);
export default Author;
