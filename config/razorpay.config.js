// NFLO/backend/config/razorpay.config.js
const Razorpay = require("razorpay");
const dotenv = require("dotenv");

// Ensure environment variables are loaded
dotenv.config();

/**
 * Initialize the Razorpay instance with your API Key ID and Secret
 * These should be stored securely in your .env file.
 */
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpayInstance;