const mongoose = require("mongoose");

/**
 * SignatureRecord
 * ---------------
 * Audit-trail document written every time a signature is permanently
 * embedded into a PDF.  One record is created per signature placement.
 */
const signatureRecordSchema = new mongoose.Schema({
  // Which original File document was signed
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true,
  },

  // Cloudinary URL of the signed (embedded) PDF
  signedPdfUrl: {
    type: String,
    required: true,
  },

  // Cloudinary public_id of the signed PDF (allows deletion / re-fetch)
  cloudinaryId: {
    type: String,
    required: true,
  },

  // ---- Hidden metadata collected by the frontend ----
  ipAddress: {
    type: String,
    default: "unknown",
    trim: true,
  },

  // Email of the external signer (populated for public invite-based signatures)
  signerEmail: {
    type: String,
    default: null,
    trim: true,
  },

  // ISO-8601 string sent from the frontend (when the sig was placed on screen)
  timestamp: {
    type: Date,
    required: true,
  },


  // "drawn" | "text"
  signatureType: {
    type: String,
    enum: ["drawn", "text", "unknown"],
    default: "drawn",
  },

  // JWT-authenticated user who triggered the save (null for public/invite signers)
  signedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  // Page index (0-based) where this signature was placed
  pageIndex: {
    type: Number,
    default: 0,
  },

  // Record creation time (server-side)
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for quick look-ups by fileId
signatureRecordSchema.index({ fileId: 1 });
// Index for auditing by IP
signatureRecordSchema.index({ ipAddress: 1 });

module.exports = mongoose.model("SignatureRecord", signatureRecordSchema);
