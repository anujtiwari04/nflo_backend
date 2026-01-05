const express = require("express");
const router = express.Router(); 
const { addQuestion, startExam, submitExam } = require("../controllers/examController");


const { protect, admin } = require("../middleware/auth");


router.post("/add-question", protect, admin, addQuestion);
router.get("/start", protect, startExam);
router.post("/submit", protect, submitExam);

module.exports = router;