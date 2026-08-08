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

const EPubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    author: { type: String, default: "" },
    publisher: { type: String, default: "ISLAMIC FOUNDATION TRUST" },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPrice: { type: Number },
    category: { type: String, required: true, default: "Tamil E-Pubs" },
    subCategory: { type: String, default: "" },
    imageUrl: { type: String, required: true },
    epubUrl: { type: String, default: "" },     // EPUB / PDF file URL
    fileFormat: { type: String, default: "EPUB" }, // EPUB, PDF, etc.
    fileSize: { type: String, default: "" },
    noOfPages: { type: Number },
    stock: { type: Number, required: true, default: 999 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    reviews: { type: [ReviewSchema], default: [] },
    description: { type: String, default: "" },
    isbn13: { type: String, default: "" },
    publicationYear: { type: String, default: "" },
    dateReleased: { type: String, default: "" },
    edition: { type: String, default: "" },
    language: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

// Duplicate the ID field.
EPubSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialised.
EPubSchema.set("toJSON", {
  virtuals: true,
});

// Add indexes for optimized sorting & filtering
EPubSchema.index({ category: 1 });
EPubSchema.index({ updatedAt: -1 });
EPubSchema.index({ createdAt: -1 });

export const EPub =
  mongoose.models.EPub || mongoose.model("EPub", EPubSchema);
