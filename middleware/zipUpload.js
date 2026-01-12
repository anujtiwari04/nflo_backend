const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure temp directory exists for extracting zips
const tempDir = "temp_uploads/";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-bulk-photos.zip`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept standard zip MIME types
  if (
    file.mimetype === "application/zip" || 
    file.mimetype === "application/x-zip-compressed" || 
    file.mimetype === "multipart/x-zip"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only .zip files are allowed!"), false);
  }
};

const zipUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter,
});

module.exports = zipUpload;