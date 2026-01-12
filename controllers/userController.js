const User = require("../models/User");
const Otp = require("../models/Otp");
const AuditLog = require("../models/AuditLog");
const jwt = require("jsonwebtoken");
const sgMail = require('@sendgrid/mail');
const { sendEmail } = require("../config/mailer.config");
const razorpayInstance = require("../config/razorpay.config");
const crypto = require("crypto");
const { PRICES } = require("../config/constants");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const generateRegistrationId = async () => {
  const lastUser = await User.findOne().sort({ createdAt: -1 });
  const prefix = "NFLO26-";

  // Case 1: No users exist yet
  if (!lastUser || !lastUser.registrationId) {
    return prefix + "1001";
  }

  // Case 2: Users exist, increment the ID
  const parts = lastUser.registrationId.split("-");
  const lastIdNum = parseInt(parts[1], 10);

  // Safety check: if parsing fails or previous IDs were < 1000, jump to 1001
  let newIdNum = isNaN(lastIdNum) ? 1001 : lastIdNum + 1;
  if (newIdNum < 1001) newIdNum = 1001;

  return prefix + newIdNum;
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({ email, otp });

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

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
      category, schoolName, courseName, address, pincode, city,
      hardCopy, totalPrice,
      razorpay_order_id, razorpay_payment_id, razorpay_signature
    } = req.body;

    // --- Server-side Price Verification ---
    const basePrice = PRICES[category] || 0;
    const bookPrice = hardCopy === "true" ? PRICES.hardCopy : 0;
    const expectedTotal = basePrice + bookPrice;

    if (Number(totalPrice) !== expectedTotal) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount calculated."
      });
    }

    // Verify Payment Signature
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

    // CHANGE: Password is now the mobile number
    const generatedPassword = mobile;

    const newUser = await User.create({
      registrationId: newRegistrationId,
      password: generatedPassword,
      fullName,
      fatherName,
      motherName,
      mobile,
      email,
      category,
      schoolName,
      courseName,
      address,
      pincode,
      city,
      hardCopy: hardCopy === "true",
      totalPaid: Number(totalPrice),
      photoPath: req.file.path,
      transactionId: razorpay_payment_id,
    });

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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        registrationId: user.registrationId,
        role: user.role,
        email: user.email,
        mobile: user.mobile,
        photoPath: user.photoPath
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, hardCopy, city, pendingPhoto } = req.query;
    const query = { role: "user" };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { schoolName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { registrationId: { $regex: search, $options: "i" } },
        { fatherName: { $regex: search, $options: "i" } },
        { motherName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { pincode: { $regex: search, $options: "i" } },
        { transactionId: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    if (hardCopy && hardCopy !== "all") {
      query.hardCopy = hardCopy === "true";
    }

    if (pendingPhoto === "true") {
      query.isPhotoUploaded = false; // Only show users with dummy avatars
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-password");

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        totalUsers: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      }
    });

  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const bulkRegisterUsers = async (req, res) => {
  try {
    const { students } = req.body;
    // students should be an array of objects: [{ fullName, mobile, email, ... }, ...]

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid data. Array expected." });
    }

    // 1. Determine Starting Registration ID
    const lastUser = await User.findOne().sort({ createdAt: -1 });
    const prefix = "NFLO26-";
    let lastIdNum = 1000;

    if (lastUser && lastUser.registrationId) {
      const parts = lastUser.registrationId.split("-");
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed)) lastIdNum = parsed;
    }

    const usersToInsert = [];

    // 2. Process the list
    for (const student of students) {
      // Basic Validation (skip empty rows)
      if (!student.fullName || !student.mobile) continue;

      lastIdNum++;
      const newRegistrationId = prefix + lastIdNum;

      // Password = Mobile Number
      const generatedPassword = student.mobile.toString();

      // Calculate Price (if not provided)
      const basePrice = PRICES[student.category] || 0;
      const bookPrice = student.hardCopy === true || student.hardCopy === "true" ? PRICES.hardCopy : 0;
      const calculatedTotal = basePrice + bookPrice;

      usersToInsert.push({
        registrationId: newRegistrationId,
        password: generatedPassword,

        // Personal Details
        fullName: student.fullName,
        fatherName: student.fatherName || "Not Provided",
        motherName: student.motherName || "Not Provided",
        mobile: student.mobile,
        email: student.email,
        category: student.category || "JUNIOR", // Default if missing

        // Address/School
        schoolName: student.schoolName || "External",
        courseName: student.courseName || "Standard",
        address: student.address || "Bulk Import",
        city: student.city || "Unknown",
        pincode: student.pincode || "000000",

        // Transaction & Meta
        hardCopy: student.hardCopy === true || student.hardCopy === "true",
        totalPaid: student.totalPaid || calculatedTotal,
        transactionId: "CASH_BULK_" + Date.now(),
        role: "user",

        // --- NEW FIELDS ---
        photoPath: "public/placeholder.svg", // The dummy image
        isPhotoUploaded: false // Flag to track pending photos
      });
    }

    // 3. Bulk Insert
    if (usersToInsert.length > 0) {
      // { ordered: false } ensures valid entries are saved even if some fail (duplicates)
      await User.insertMany(usersToInsert, { ordered: false });

      // 4. Create Audit Log
      await AuditLog.create({
        adminId: req.user._id, // Assuming 'req.user' is populated by auth middleware
        action: "BULK_IMPORT",
        details: { count: usersToInsert.length, firstId: usersToInsert[0].registrationId },
        ipAddress: req.ip
      });
    }

    res.status(201).json({
      success: true,
      message: `Processed ${usersToInsert.length} users.`,
    });

  } catch (error) {
    console.error("Bulk Register Error:", error);
    if (error.code === 11000) {
      return res.status(206).json({ success: true, message: "Partial success. Some duplicates were skipped." });
    }
    res.status(500).json({ success: false, message: "Bulk import failed" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Find original user for Audit Log comparison
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const changes = {};

    // 1. Handle Photo Upload (if a file is sent)
    if (req.file) {
      changes.oldPhoto = user.photoPath;
      user.photoPath = req.file.path;
      user.isPhotoUploaded = true; // <--- FLIP THE FLAG
      changes.newPhoto = req.file.path;
    }

    // 2. Handle Text Updates
    // 2. Handle Text Updates
    Object.keys(updates).forEach((key) => {
      // Normalize both values to strings for comparison
      const currentVal = String(user[key] || "").trim();
      const newVal = String(updates[key] || "").trim();

      // Prevent updating sensitive fields and only track real changes
      if (key !== "_id" && key !== "registrationId" && key !== "password" && currentVal !== newVal) {
        changes[key] = { from: user[key], to: updates[key] };
        user[key] = updates[key];
      }
    });

    await user.save();

    // 3. Create Audit Log
    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        adminId: req.user._id,
        targetRegistrationId: user.registrationId,
        action: req.file ? "UPDATE_USER_PHOTO" : "UPDATE_USER_DETAILS",
        details: changes,
        ipAddress: req.ip
      });
    }

    res.status(200).json({ success: true, message: "User updated successfully", user });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

const bulkUploadPhotos = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No zip file provided" });
    }

    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries(); // Array of all files in zip

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    // We need to move extracted photos to your main 'uploads/' folder
    const finalUploadDir = "uploads/";

    for (const entry of zipEntries) {
      if (entry.isDirectory || entry.entryName.startsWith("__MACOSX")) continue; // Skip folders & mac garbage

      // 1. Extract Registration ID from filename (e.g., "NFLO26-1005.jpg" -> "NFLO26-1005")
      const fileName = entry.name; // "NFLO26-1005.jpg"
      const registrationId = fileName.split(".")[0]; // "NFLO26-1005"

      // 2. Find User
      const user = await User.findOne({ registrationId });

      if (user) {
        // 3. Save file to disk
        // We rename it to ensure uniqueness (timestamp + original name)
        const newFileName = `${Date.now()}-${fileName}`;
        const newPath = path.join(finalUploadDir, newFileName);

        // Extract this specific file to the uploads folder
        fs.writeFileSync(newPath, entry.getData());

        // 4. Update Database
        user.photoPath = newPath.replace(/\\/g, "/"); // Fix windows slashes
        user.isPhotoUploaded = true;
        await user.save();

        successCount++;
      } else {
        failedCount++;
        errors.push(`User not found for file: ${fileName}`);
      }
    }

    // 5. Cleanup: Delete the uploaded zip file
    fs.unlinkSync(zipPath);

    // 6. Audit Log
    await AuditLog.create({
      adminId: req.user._id,
      action: "BULK_PHOTO_UPLOAD",
      details: { success: successCount, failed: failedCount, errors: errors.slice(0, 5) }, // Limit error log size
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Processed. Updated: ${successCount}, Skipped: ${failedCount}`,
      errors
    });

  } catch (error) {
    console.error("Bulk Photo Upload Error:", error);
    res.status(500).json({ success: false, message: "Bulk upload failed" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 }) // Newest first
      .populate("adminId", "fullName email") // Show admin details
      .limit(50); // Limit to last 50 actions to keep it fast

    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("Fetch Logs Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  createOrder,
  getAllUsers,
  sendOtp,
  verifyOtp,
  getUserById,
  bulkRegisterUsers,
  updateUser,
  bulkUploadPhotos,
  getAuditLogs
};