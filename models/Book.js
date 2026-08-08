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

const BookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    author: { type: String, default: "" },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPrice: { type: Number },
    category: { type: String, required: true },
    subCategory: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    pdfUrl: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    reviews: { type: [ReviewSchema], default: [] },
    tags: { type: [String], default: [] },
    isbn: { type: String, default: "" },
    isbn13: { type: String, default: "" },
    yearOfPublication: { type: String, default: "" },
    publicationYear: { type: String, default: "" },
    dateReleased: { type: String, default: "" },
    publisher: { type: String, default: "" },
    edition: { type: String, default: "" },
    binding: { type: String, default: "" },
    noOfPages: { type: Number },
    description: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// Duplicate the ID field.
BookSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialised.
BookSchema.set("toJSON", {
  virtuals: true,
});

// Add indexes for optimized sorting & filtering
BookSchema.index({ category: 1 });
BookSchema.index({ updatedAt: -1 });
BookSchema.index({ createdAt: -1 });

export const Book = mongoose.models.Book || mongoose.model("Book", BookSchema);
