const Question = require("../models/Question");
const ExamResult = require("../models/ExamResult");

// 1. Admin: Add a new Question
const addQuestion = async (req, res) => {
  try {
    const { text, options, correctOption, category, marks } = req.body;
    
    // Basic validation
    if (!text || !options || !correctOption || !category) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const newQuestion = await Question.create({
      text,
      options,
      correctOption,
      category,
      marks
    });

    res.status(201).json({ success: true, message: "Question added", question: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding question", error: error.message });
  }
};

// 2. User: Start Exam (Fetch Questions)
const startExam = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const userCategory = req.user.category; // Assuming middleware adds this or fetch from DB

    // Check if user already attempted
    const existingAttempt = await ExamResult.findOne({ user: userId });
    if (existingAttempt) {
      return res.status(403).json({ success: false, message: "You have already attempted the exam." });
    }

    // Initialize Exam Result
    await ExamResult.create({ user: userId });

    // Fetch questions for user's category
    // Note: We exclude 'correctOption' automatically due to schema definition 'select: false'
    // To be extra safe, we can explicitly exclude it here too.
    const questions = await Question.find({ category: userCategory }).select("-correctOption");

    if (!questions || questions.length === 0) {
        return res.status(404).json({ success: false, message: "No questions found for your category." });
    }

    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error starting exam" });
  }
};

// 3. User: Submit Exam
const submitExam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { answers } = req.body; // Object like { "questionId1": "optionId", "questionId2": "optionId" }

    const examRecord = await ExamResult.findOne({ user: userId });
    if (!examRecord) return res.status(404).json({ success: false, message: "No exam session found." });
    if (examRecord.status !== "in_progress") return res.status(400).json({ success: false, message: "Exam already submitted." });

    // Calculate Score
    let score = 0;
    // We need to fetch questions WITH correct options to grade
    const questions = await Question.find({ _id: { $in: Object.keys(answers) } }).select("+correctOption");

    questions.forEach(q => {
      if (answers[q._id] === q.correctOption) {
        score += q.marks;
      }
    });

    // Update Result
    examRecord.score = score;
    examRecord.status = "completed";
    examRecord.endTime = Date.now();
    await examRecord.save();

    res.status(200).json({ success: true, message: "Exam submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error submitting exam" });
  }
};

module.exports = { addQuestion, startExam, submitExam };