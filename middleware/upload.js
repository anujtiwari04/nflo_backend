const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Storage Strategy
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // timestamp-filename.extension
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File Filter (Images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg and .png formats allowed!"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 }, // 200KB limit
  fileFilter,
});

module.exports = upload;