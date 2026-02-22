const SignatureRecord = require("../models/SignatureRecord");

exports.getAuditTrail = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ success: false, message: "File ID is required" });
    }

    // Fetch all signature records for this file ID, sorted by timestamp (oldest to newest)
    const auditRecords = await SignatureRecord.find({ fileId })
      .populate("signedBy", "name email") // Include registered user info if they signed it
      .sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      auditRecords,
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
