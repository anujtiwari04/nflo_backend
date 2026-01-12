const upload = require("./upload"); // Import your existing configuration

const handleImageUpload = (req, res, next) => {
  // We call the upload middleware manually here
  const uploadSingle = upload.single("photo");

  uploadSingle(req, res, (err) => {
    if (err) {
      // 1. File Size Error (Multer limit)
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ 
          success: false, 
          message: "File is too large. Maximum size allowed is 200KB." 
        });
      }
      
      // 2. File Type Error (From your fileFilter)
      if (err.message === "Only .jpeg, .jpg and .png formats allowed!") {
         return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      // 3. Any other standard error
      return res.status(400).json({ 
        success: false, 
        message: "Image upload failed: " + err.message 
      });
    }

    // No error? Continue to the controller
    next();
  });
};

module.exports = handleImageUpload;