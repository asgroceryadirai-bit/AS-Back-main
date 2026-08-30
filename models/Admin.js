import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["admin", "orders", "catalog", "news", "superadmin"],
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
