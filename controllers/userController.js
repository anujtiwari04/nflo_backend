const User = require("../models/User");
const Otp = require("../models/Otp");
const jwt = require("jsonwebtoken");
const sgMail = require('@sendgrid/mail'); // Keeping for existing logic if needed, or replace with sendEmail
const { sendEmail } = require("../config/mailer.config"); // Use centralized mailer
const razorpayInstance = require("../config/razorpay.config");
const crypto = require("crypto");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const generateRegistrationId = async () => {
  const lastUser = await User.findOne().sort({ createdAt: -1 });
  const prefix = "NFLO26-";
  if (!lastUser || !lastUser.registrationId) return prefix + "001";
  const lastIdStr = lastUser.registrationId.split("-")[1]; 
  const lastIdNum = parseInt(lastIdStr, 10);
  const newIdNum = lastIdNum + 1;
  const newIdStr = newIdNum.toString().padStart(3, "0");
  return prefix + newIdStr;
};


// 1. Send OTP
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (Update if exists or Insert new)
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send Email
    await sendEmail({
      to: email,
      subject: "NFLO Verification Code",
      text: `Your verification code is ${otp}. It is valid for 10 minutes.`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
               <h2>Email Verification</h2>
               <p>Your verification code for NFLO Registration is:</p>
               <h1 style="color: #2563eb; letter-spacing: 5px;">${otp}</h1>
               <p>This code is valid for 10 minutes.</p>
             </div>`
    });

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// 2. Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email, otp });

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Optional: Delete OTP after usage to prevent reuse
    // await Otp.deleteOne({ _id: record._id });

    res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};


const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: Number(amount) * 100, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};

const registerUser = async (req, res) => {
  try {
    const {
      fullName, fatherName, motherName, mobile, email,
      category, courseName, address, pincode, city,
      hardCopy, totalPrice,
      razorpay_order_id, razorpay_payment_id, razorpay_signature 
    } = req.body;

    // Verify Payment
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo is required." });
    }

    const newRegistrationId = await generateRegistrationId();
    const generatedPassword = `${email}#${newRegistrationId}`;

    const newUser = await User.create({
      registrationId: newRegistrationId,
      password: generatedPassword, 
      fullName,
      fatherName,
      motherName,
      mobile,
      email,
      category,
      courseName,
      address,
      pincode,
      city,
      hardCopy: hardCopy === "true",
      totalPaid: Number(totalPrice),
      photoPath: req.file.path,
    });

    // Send Credentials Email (Requirement #3)
    await sendEmail({
      to: email,
      subject: 'NFLO Registration Successful',
      text: `Hello ${fullName}, Your Registration ID: ${newRegistrationId}, Password: ${generatedPassword}`,
      html: `<h3>Hello ${fullName},</h3>
             <p>Your account has been created successfully.</p>
             <p><strong>ID:</strong> ${newRegistrationId}</p>
             <p><strong>Password:</strong> ${generatedPassword}</p>
             <p>Please use these credentials to login.</p>`
    });

    res.status(201).json({
      success: true,
      message: "Registration and Payment successful!",
      data: newUser,
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { registrationId, password } = req.body;
    const user = await User.findOne({ registrationId });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        registrationId: user.registrationId,
        email: user.email,
        mobile: user.mobile,
        photoPath: user.photoPath
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { registerUser, loginUser, createOrder, sendOtp, verifyOtp };