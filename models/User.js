const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // --- Generated Credentials ---
    registrationId: {
      type: String,
      unique: true, 
    },
    password: {
      type: String,
    },
    
    // --- Role Based Access ---
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user", // Default is user. Change to 'admin' manually in DB.
    },

    // --- Personal Details ---
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true }, 
    mobile: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },
    
    // --- Address & Academic ---
    address: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Class 6th to 10th", "Class 11th / 12th", "College"],
    },
    courseName: { type: String, required: true, trim: true },
    
    // --- Transaction ---
    hardCopy: { type: Boolean, default: false },
    totalPaid: { type: Number, required: true },
    photoPath: { type: String, required: true },
    transactionId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);