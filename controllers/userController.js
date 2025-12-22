const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Helper function to generate next ID
const generateRegistrationId = async () => {
  // Find the most recently created user
  const lastUser = await User.findOne().sort({ createdAt: -1 });

  // Base format
  const prefix = "NFLO26-";
  
  if (!lastUser || !lastUser.registrationId) {
    return prefix + "001"; // First user ever
  }

  // Extract the number part (e.g., from NFLO26-024 extract "024")
  const lastIdStr = lastUser.registrationId.split("-")[1]; 
  const lastIdNum = parseInt(lastIdStr, 10);
  
  // Increment
  const newIdNum = lastIdNum + 1;
  
  // Pad with zeros (e.g., 5 -> "005", 12 -> "012")
  const newIdStr = newIdNum.toString().padStart(3, "0");
  
  return prefix + newIdStr;
};

const registerUser = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo is required." });
    }

    const {
      fullName, fatherName, motherName, mobile, email,
      category, courseName, address, pincode, city,
      hardCopy, totalPrice,
    } = req.body;

    // 1. Generate Unique Registration ID
    const newRegistrationId = await generateRegistrationId();

    // 2. Generate Password (email + # + ID)
    const generatedPassword = `${email}#${newRegistrationId}`;

    // 3. Create User Entry
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

    if (newUser) {
      res.status(201).json({
        success: true,
        message: "Registration successful!",
        credentials: {
          id: newUser.registrationId,
          password: newUser.password
        },
        data: newUser,
      });
    }
  } catch (error) {
    console.error("Error in registerUser:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { registrationId, password } = req.body;

    if (!registrationId || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide Registration ID and Password" 
      });
    }

    const user = await User.findOne({ registrationId });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Invalid Registration ID" 
      });
    }

    if (user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Password" 
      });
    }

    const token = jwt.sign(
      { id: user._id, registrationId: user.registrationId },
      process.env.JWT_SECRET, 
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token, 
      data: {
        _id: user._id,
        registrationId: user.registrationId,
        fullName: user.fullName,
        email: user.email,
        category: user.category,
        photoPath: user.photoPath,
        mobile: user.mobile
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { registerUser, loginUser };