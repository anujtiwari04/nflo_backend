// This file defines the exact category names and pricing for the whole app.

const USER_CATEGORIES = {
  // Category 1: Junior (Class 6-10)
  JUNIOR: "Class 6th to 10th", 
  
  // Category 2: Senior (Class 11-12 or College)
  SENIOR: "Class 11th / 12th or College" 
};

// Pricing Configuration
const PRICES = {
  "Class 6th to 10th": 300,
  "Class 11th / 12th or College": 500,
  hardCopy: 300
};

// Helper to get just the values ["Class 6th to 10th", "Class 11th / 12th or College"]
const USER_CATEGORY_ENUM = Object.values(USER_CATEGORIES);

module.exports = {
  USER_CATEGORIES,
  USER_CATEGORY_ENUM,
  PRICES
};