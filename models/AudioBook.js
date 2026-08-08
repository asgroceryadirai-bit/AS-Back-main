import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AudioTrackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    duration: { type: String, default: "" },
  },
  { _id: false }
);

const AudioBookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    author: { type: String, default: "" },
    publisher: { type: String, default: "ISLAMIC FOUNDATION TRUST" },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    category: { type: String, required: true },
    imageUrl: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    reviews: { type: [ReviewSchema], default: [] },
    tags: { type: [String], default: [] },
    description: { type: String, default: "" },
    language: { type: String, default: "" },
    isbn: { type: String, default: "" },
    isbn13: { type: String, default: "" },
    publicationYear: { type: String, default: "" },
    dateReleased: { type: String, default: "" },
    edition: { type: String, default: "" },
    binding: { type: String, default: "" },
    noOfPages: { type: Number },
    audioVoiceOver: { type: String, default: "" },
    audioFiles: {
      type: [
        {
          name: { type: String, required: true },
          url: { type: String, required: true },
          duration: { type: String, default: "" },
          size: { type: Number }
        }
      ],
      default: []
    },
    audioTracks: { type: [AudioTrackSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Duplicate the ID field.
AudioBookSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialised.
AudioBookSchema.set("toJSON", {
  virtuals: true,
});

// Add indexes for optimized sorting & filtering
AudioBookSchema.index({ category: 1 });
AudioBookSchema.index({ updatedAt: -1 });
AudioBookSchema.index({ createdAt: -1 });

export const AudioBook =
  mongoose.models.AudioBook || mongoose.model("AudioBook", AudioBookSchema);
