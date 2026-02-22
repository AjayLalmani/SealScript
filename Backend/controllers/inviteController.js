const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const { randomUUID } = require("crypto");
const File = require("../models/File");
const SignRequest = require("../models/SignRequest");

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight email helper using Node's built-in https to call Gmail SMTP API
// via the nodemailer-free approach: raw SMTP over TLS using the net/tls module.
// 
// Since embedding a raw SMTP client is complex, we use the simpler approach:
// lazy-require nodemailer if available, otherwise log the link to console only.
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  // Try nodemailer if installed
  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch {
    throw new Error("Email service is not configured on the server (nodemailer missing).");
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER/EMAIL_PASS are not configured.");
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER/EMAIL_PASS are not configured.");
  }

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const secure = smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      servername: smtpHost,
      minVersion: "TLSv1.2",
    },
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });

  await transporter.sendMail({
    from: `"SealScript" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invite/send
// Body: { fileId, signerEmail }
// Auth: required (document owner)
// ─────────────────────────────────────────────────────────────────────────────
exports.sendInvite = async (req, res) => {
  try {
    const { fileId, signerEmail } = req.body;
    const userId = req.user.userId;

    if (!fileId || !signerEmail) {
      return res.status(400).json({ message: "fileId and signerEmail are required." });
    }

    // Verify the file belongs to the requesting user
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }
    if (file.uploadedBy.toString() !== userId) {
      return res.status(403).json({ message: "Not authorised." });
    }

    // Create a unique token and sign request (expires in 48 hours)
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await SignRequest.create({
      fileId,
      signerEmail,
      token,
      expiresAt,
      createdBy: userId,
    });

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const signingLink = `${frontendUrl}/sign/${token}`;

    // Always log the link so it can be tested without email
    console.log(`🔗 Signing link for ${signerEmail}: ${signingLink}`);

    try {
      await sendEmail({
        to: signerEmail,
        subject: `You've been invited to sign a document — ${file.fileName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">📝 Document Signing Request</h2>
          <p style="color: #475569; font-size: 15px;">You have been invited to sign the document:</p>
          <p style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-weight: bold; color: #1e293b;">${file.fileName}</p>
          <p style="color: #475569; font-size: 14px;">Click the button below to review and sign it. This link is valid for <strong>48 hours</strong> and can only be used once.</p>
          <a href="${signingLink}" style="display:inline-block; margin-top: 16px; padding: 12px 28px; background: #4f46e5; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Sign Document →
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">If you did not expect this email, you can safely ignore it.</p>
        </div>
      `,
      });

      console.log(`📧 Invite email sent successfully to ${signerEmail}`);
      return res.status(200).json({
        success: true,
        message: `Link created and email sent to ${signerEmail}.`,
        signingLink,
        token,
        emailSent: true,
      });
    } catch (emailErr) {
      console.warn(`⚠️  Email failed (check EMAIL_USER/EMAIL_PASS in .env): ${emailErr.message}`);
      return res.status(200).json({
        success: true,
        message: `Link created, but email delivery failed. Share the signing link manually.`,
        signingLink,
        token,
        emailSent: false,
        emailError: emailErr.message,
      });
    }

  } catch (err) {
    console.error("sendInvite error:", err);
    return res.status(500).json({ message: "Failed to send invitation." });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invite/:token
// Public — returns file URL + fileId if token is valid + unused + not expired
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.params;

    const signRequest = await SignRequest.findOne({ token }).populate("fileId");

    if (!signRequest) {
      return res.status(404).json({ valid: false, message: "Invalid signing link." });
    }
    if (signRequest.used) {
      return res.status(410).json({ valid: false, message: "This link has already been used." });
    }
    if (new Date() > signRequest.expiresAt) {
      return res.status(410).json({ valid: false, message: "This link has expired." });
    }

    const file = signRequest.fileId; // populated
    return res.status(200).json({
      valid: true,
      fileId: file._id,
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      signerEmail: signRequest.signerEmail,
      expiresAt: signRequest.expiresAt,
    });
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invite/:token/use
// Public — marks the token as used after signing is complete
// ─────────────────────────────────────────────────────────────────────────────
exports.markUsed = async (req, res) => {
  try {
    const { token } = req.params;

    const signRequest = await SignRequest.findOne({ token });
    if (!signRequest) {
      return res.status(404).json({ message: "Token not found." });
    }

    signRequest.used = true;
    signRequest.status = "completed";
    await signRequest.save();

    console.log(`✅ Token marked as used: ${token}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("markUsed error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invite/:token/reject
// Public — marks the token as rejected by the signer
// ─────────────────────────────────────────────────────────────────────────────
exports.reject = async (req, res) => {
  try {
    const { token } = req.params;

    const signRequest = await SignRequest.findOne({ token });
    if (!signRequest) {
      return res.status(404).json({ message: "Token not found." });
    }

    if (signRequest.used) {
      return res.status(410).json({ message: "This link has already been processed." });
    }

    signRequest.used = true;
    signRequest.status = "rejected";
    await signRequest.save();

    console.log(`❌ Token marked as rejected: ${token}`);
    return res.status(200).json({ success: true, message: "Signature rejected successfully." });
  } catch (err) {
    console.error("reject error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};
