const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const signController = require("../controllers/signController");

// Store the uploaded PDF ONLY in memory — zero disk I/O
const memUpload = multer({ storage: multer.memoryStorage() });

// POST /api/sign/embed
// multipart/form-data: { pdf: File, signatures: JSON string, fileId: string }
router.post(
  "/embed",
  auth,
  memUpload.single("pdf"),
  signController.embed
);

// POST /api/sign/embed-public
// JSON body: { fileId, signatures }  +  x-invite-token header
// Backend fetches the PDF from Cloudinary server-side — no file upload needed
router.post(
  "/embed-public",
  signController.embedPublic
);


module.exports = router;

