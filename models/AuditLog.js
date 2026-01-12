const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: { type: String }, 
    
    targetRegistrationId: {
      type: String, 
      required: false 
    }, 

    action: {
      type: String,
      required: true,
      enum: [
        "BULK_IMPORT", 
        "UPDATE_USER", 
        "UPLOAD_PHOTO", 
        "DELETE_USER", 
        "BULK_PHOTO_UPLOAD", 
        "UPDATE_USER_DETAILS", 
        "UPDATE_USER_PHOTO"
      ],
    },

    details: {
      type: mongoose.Schema.Types.Mixed, 
      required: false
    }, 

    ipAddress: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);