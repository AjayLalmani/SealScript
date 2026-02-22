const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const auditController = require("../controllers/auditController");

// @route   GET /api/audit/:fileId
// @desc    Get the audit trail (list of SignatureRecords) for a specific document
// @access  Private (Requires authentication)
router.get("/:fileId", auth, auditController.getAuditTrail);

module.exports = router;
