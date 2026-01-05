const mongoose = require("mongoose");
const { USER_CATEGORY_ENUM } = require("../config/constants"); // Import the constants

const questionSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: true 
  },
  options: [{
    id: { type: String, required: true }, 
    text: { type: String, required: true }
  }],
  correctOption: { 
    type: String, 
    required: true, 
    select: false 
  },
  category: {
    type: String,
    enum: USER_CATEGORY_ENUM, // Updated to use centralized list
    required: true
  },
  marks: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);