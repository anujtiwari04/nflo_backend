const express = require("express");
const router = express.Router();
const { registerUser, loginUser, createOrder, sendOtp, verifyOtp, getAllUsers, getUserById, bulkRegisterUsers, updateUser, bulkUploadPhotos, getAuditLogs } = require("../controllers/userController");
const { getEbook } = require("../controllers/ebookController");
const upload = require("../middleware/upload");
const { protect, admin } = require("../middleware/auth");
const zipUpload = require("../middleware/zipUpload");
const handleImageUpload = require("../middleware/uploadErrorHandler");

router.post("/register", upload.single("photo"), registerUser);
router.post("/login", loginUser);
router.post("/create-order", createOrder);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/ebook", protect, getEbook);
router.get("/all", protect, admin, getAllUsers);
router.get("/audit-logs", protect, admin, getAuditLogs);
router.get("/:id", protect, admin, getUserById);
router.post("/bulk-register", protect, admin, bulkRegisterUsers);
router.post("/bulk-photos",protect,admin, 
  zipUpload.single("zipFile"), // Expecting form-data key "zipFile"
  bulkUploadPhotos
);

router.put("/update/:id", protect, admin, handleImageUpload, updateUser);

module.exports = router;