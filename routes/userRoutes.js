const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/userController");
const { getEbook } = require("../controllers/ebookController");
const upload = require("../middleware/upload");
const protect = require("../middleware/auth");

// Route: POST /api/user/register
router.post("/register", upload.single("photo"), registerUser);
router.post("/login", loginUser);
router.get("/ebook", protect, getEbook);

module.exports = router;