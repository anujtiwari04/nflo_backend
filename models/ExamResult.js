const mongoose = require("mongoose");

const examResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true // Ensures only ONE attempt per user
  },
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["in_progress", "completed", "terminated"],
    default: "in_progress"
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  
  // Proctoring Data
  warningCount: { type: Number, default: 0 },
  violationLogs: [{
    type: { type: String }, // e.g., "tab_switch", "face_not_visible"
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model("ExamResult", examResultSchema);