const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/inviteController");
const auth = require("../middleware/auth");

// Send an invite email (authenticated — only the file owner)
router.post("/send", auth, inviteController.sendInvite);

// Verify a token — public, no auth required
router.get("/:token", inviteController.verifyToken);

// Mark token as used after signing — public, no auth required
router.post("/:token/use", inviteController.markUsed);

// Mark token as rejected by signer — public, no auth required
router.post("/:token/reject", inviteController.reject);

module.exports = router;
