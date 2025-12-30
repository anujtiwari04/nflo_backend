const express = require("express");
const router = express.Router();
const { registerUser, loginUser, createOrder, sendOtp, verifyOtp } = require("../controllers/userController");
const { getEbook } = require("../controllers/ebookController");
const upload = require("../middleware/upload");
const { protect, admin } = require("../middleware/auth");

// Route: POST /api/user/register
router.post("/register", upload.single("photo"), registerUser);
router.post("/login", loginUser);
router.post("/create-order", createOrder);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/ebook", protect, getEbook);

module.exports = router;