const { PDFDocument } = require("pdf-lib");
const { cloudinary } = require("../cloudinary");
const { rgb } = require("pdf-lib");
const SignatureRecord = require("../models/SignatureRecord");
const streamifier = require("streamifier");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: upload a Buffer to Cloudinary using upload_stream (zero disk I/O)
// ─────────────────────────────────────────────────────────────────────────────
const uploadBufferToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: strip the data-URI prefix and return a raw PNG Buffer
//   "data:image/png;base64,iVBORw0KGgo…"  →  Buffer<89 50 4e 47 …>
// ─────────────────────────────────────────────────────────────────────────────
const base64ToBuffer = (dataURL) => {
  const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
};

// ─────────────────────────────────────────────────────────────────────────────
// Core coordinate-mapping function
//
//  Frontend space                          PDF (pdf-lib) space
//  ─────────────────                       ─────────────────────────────────
//  Origin  : top-left of 600 px container  Origin  : bottom-left of page
//  Y-axis  : increases downward            Y-axis  : increases upward
//  Units   : CSS pixels                    Units   : PDF points (1pt = 1/72in)
//
//  Algorithm
//  ─────────
//  1. scale = actualPdfWidth_pts / FRONTEND_PDF_WIDTH_PX   (e.g. 595 / 600)
//  2. pdf_x = sig.x * scale
//  3. pdf_w = sig.width  * scale
//  4. pdf_h = sig.height * scale
//  5. pdf_y = actualPdfHeight_pts - (sig.y * scale) - pdf_h   ← invert Y
// ─────────────────────────────────────────────────────────────────────────────
const FRONTEND_PDF_WIDTH_PX = 600;

const mapCoordinates = (sig, pageWidth, pageHeight) => {
  const scale = pageWidth / FRONTEND_PDF_WIDTH_PX;

  const pdfX = sig.x * scale;
  const pdfW = sig.width * scale;
  const pdfH = sig.height * scale;

  // Invert Y-axis: CSS top-left → PDF bottom-left
  const pdfY = pageHeight - sig.y * scale - pdfH;

  return { x: pdfX, y: pdfY, width: pdfW, height: pdfH };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sign/embed
//
// Expects multipart/form-data:
//   pdf        : File   – the original PDF (via multer memoryStorage)
//   signatures : string – JSON array of signature objects
//   fileId     : string – MongoDB _id of the original File document
//
// Each signature object shape:
// {
//   src    : "data:image/png;base64,…",
//   x      : number,   // CSS px from left of 600px container
//   y      : number,   // CSS px from top  of container
//   width  : number,   // CSS px
//   height : number,   // CSS px
//   metadata: {
//     ipAddress     : string,
//     timestamp     : string,   // ISO-8601
//     signatureType : string,   // "drawn" | "text"
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.embed = async (req, res) => {
  try {
    // ── 1. Validate incoming data ─────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded." });
    }

    let signatures;
    try {
      signatures = JSON.parse(req.body.signatures || "[]");
    } catch {
      return res.status(400).json({ message: "Invalid signatures JSON." });
    }

    if (!Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({ message: "No signatures provided." });
    }

    const fileId = req.body.fileId;
    if (!fileId) {
      return res.status(400).json({ message: "fileId is required." });
    }

    const userId = req.user.userId;

    // ── 2. Load the PDF entirely from memory ─────────────────────────────────
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pdfPages = pdfDoc.getPages();

    console.log(`🖊️  Embedding ${signatures.length} signature(s)…`);

    // ── 3. Embed each signature PNG into the PDF ──────────────────────────────
    for (const sig of signatures) {
      if (!sig.src) {
        console.warn("⚠️  Skipping signature with no src");
        continue;
      }
      
      const sigPageIndex = sig.pageIndex || 0;
      if (sigPageIndex >= pdfPages.length) {
          console.warn(`⚠️  Skipping signature on invalid page ${sigPageIndex}`);
          continue;
      }
      const page = pdfPages[sigPageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Decode base64 PNG → Buffer → pdf-lib PngEmbedder
      const pngBuffer = base64ToBuffer(sig.src);
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      // Map CSS coordinates → PDF point coordinates (the bounding box)
      const { x: boxX, y: boxY, width: boxW, height: boxH } = mapCoordinates(
        sig,
        pageWidth,
        pageHeight
      );

      // ── object-fit: contain ───────────────────────────────────────────────
      // The browser renders the signature <img> with object-contain, which
      // means it never stretches — it scales the image to fit inside the box
      // while preserving the PNG's natural aspect ratio, then centres it.
      // pdf-lib's drawImage has no such option; we compute it manually.
      //
      // Natural PNG dimensions (in px — ratio is all that matters here)
      const natW = pngImage.width;
      const natH = pngImage.height;
      const imageAspect     = natW / natH;
      const containerAspect = boxW / boxH;

      let drawW, drawH;
      if (imageAspect > containerAspect) {
        // Image is wider than the box → constrain by width
        drawW = boxW;
        drawH = boxW / imageAspect;
      } else {
        // Image is taller than the box → constrain by height
        drawH = boxH;
        drawW = boxH * imageAspect;
      }

      // Centre the contained image inside the bounding box
      const drawX = boxX + (boxW - drawW) / 2;
      const drawY = boxY + (boxH - drawH) / 2;
      // ── end object-fit logic ──────────────────────────────────────────────

      console.log(
        `  ✅ Signature at PDF (${drawX.toFixed(1)}, ${drawY.toFixed(1)}) ` +
          `draw ${drawW.toFixed(1)}×${drawH.toFixed(1)} pts ` +
          `[box ${boxW.toFixed(1)}×${boxH.toFixed(1)}, ` +
          `natural ${natW}×${natH} px]`
      );

      page.drawImage(pngImage, { x: drawX, y: drawY, width: drawW, height: drawH });
    }

    // ── 4. Serialise the modified PDF to a Buffer (still in memory) ───────────
    const signedPdfBytes = await pdfDoc.save();
    const signedBuffer = Buffer.from(signedPdfBytes);

    // ── 5. Upload signed PDF to Cloudinary via stream (zero disk I/O) ─────────
    const uploadResult = await uploadBufferToCloudinary(signedBuffer, {
      folder: "SealScript_DEV/signed",
      resource_type: "raw",
      format: "pdf",
      public_id: `signed_${fileId}_${Date.now()}`,
    });

    console.log("☁️  Cloudinary upload complete:", uploadResult.secure_url);

    // ── 6. Persist one SignatureRecord per signature (audit trail) ────────────
    const recordIds = [];

    for (const sig of signatures) {
      const meta = sig.metadata || {};

      const record = await SignatureRecord.create({
        fileId,
        signedPdfUrl: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        ipAddress: meta.ipAddress || "unknown",
        timestamp: meta.timestamp ? new Date(meta.timestamp) : new Date(),
        signatureType: meta.signatureType || "drawn",
        signedBy: userId,
        pageIndex: sig.pageIndex || 0,
      });

      recordIds.push(record._id);
      console.log("📝 SignatureRecord saved:", record._id);
    }

    // ── 7. Respond with signed PDF URL ────────────────────────────────────────
    return res.status(200).json({
      success: true,
      signedUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      recordIds,
    });
  } catch (err) {
    console.error("❌ signController.embed error:", err);
    return res.status(500).json({ message: "Server error during PDF signing." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sign/embed-public
// Authenticated via x-invite-token header (no user JWT needed).
// The backend fetches the original PDF directly from Cloudinary (no browser upload).
// ─────────────────────────────────────────────────────────────────────────────
const SignRequest = require("../models/SignRequest");
const File = require("../models/File");
const https = require("https");
const http = require("http");

// Helper: download a URL → Buffer (follows redirects)
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      // Follow redirects (301/302)
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching PDF`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

exports.embedPublic = async (req, res) => {
  try {
    const inviteToken = req.headers["x-invite-token"];
    if (!inviteToken) {
      return res.status(401).json({ message: "No invite token provided." });
    }

    // Verify invite token
    const signRequest = await SignRequest.findOne({ token: inviteToken });
    if (!signRequest) return res.status(404).json({ message: "Invalid invite token." });
    if (signRequest.used) return res.status(410).json({ message: "This link has already been used." });
    if (new Date() > signRequest.expiresAt) return res.status(410).json({ message: "This link has expired." });

    const { fileId, signatures: sigsJSON } = req.body;

    if (!fileId) return res.status(400).json({ message: "fileId is required." });

    // Validate fileId matches the token
    if (signRequest.fileId.toString() !== fileId) {
      return res.status(403).json({ message: "Token does not match the requested file." });
    }

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found." });

    let signatures;
    try {
      signatures = JSON.parse(sigsJSON || "[]");
    } catch {
      return res.status(400).json({ message: "Invalid signatures payload." });
    }

    if (!Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({ message: "No signatures provided." });
    }

    console.log(`🖊️  embedPublic: ${signatures.length} sig(s) for ${signRequest.signerEmail}, fetching PDF…`);

    // ── Fetch PDF server-side (no CORS, no browser issues) ───────────────────
    const pdfBuffer = await downloadBuffer(file.fileUrl);
    console.log(`📄 PDF fetched: ${pdfBuffer.length} bytes from ${file.fileUrl}`);

    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pdfPages = pdfDoc.getPages();

    // Embed each signature using mapCoordinates + object-fit contain
    for (const sig of signatures) {
      if (!sig.src) { console.warn("⚠️  Skipping sig without src"); continue; }

      const sigPageIndex = sig.pageIndex || 0;
      if (sigPageIndex >= pdfPages.length) {
          console.warn(`⚠️  Skipping signature on invalid page ${sigPageIndex}`);
          continue;
      }
      const page = pdfPages[sigPageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const pngBuffer = base64ToBuffer(sig.src);
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      // Map CSS coords → PDF point coords (invert Y-axis)
      const { x: boxX, y: boxY, width: boxW, height: boxH } = mapCoordinates(sig, pageWidth, pageHeight);

      // 🔴 DEBUG 1: Terminal me exact coordinates print karo
      console.log(`[DEBUG] Frontend bhej raha hai: x=${sig.x}, y=${sig.y}`);
      console.log(`[DEBUG] PDF me draw hoga at: X=${boxX.toFixed(1)}, Y=${boxY.toFixed(1)}, Width=${boxW.toFixed(1)}, Height=${boxH.toFixed(1)}`);

      // object-fit: contain — preserve signature aspect ratio
      const natW = pngImage.width;
      const natH = pngImage.height;
      const imageAspect = natW / natH;
      const containerAspect = boxW / boxH;

      let drawW, drawH;
      if (imageAspect > containerAspect) {
        drawW = boxW;
        drawH = boxW / imageAspect;
      } else {
        drawH = boxH;
        drawW = boxH * imageAspect;
      }

      const drawX = boxX + (boxW - drawW) / 2;
      const drawY = boxY + (boxH - drawH) / 2;

      console.log(`  ✅ Sig at PDF (${drawX.toFixed(1)}, ${drawY.toFixed(1)}) ${drawW.toFixed(1)}×${drawH.toFixed(1)}pts`);
      
      // Actual image draw
      page.drawImage(pngImage, { x: drawX, y: drawY, width: drawW, height: drawH });
    }
    // Serialise → Buffer
    const signedPdfBytes = await pdfDoc.save();
    const signedBuffer = Buffer.from(signedPdfBytes);
    console.log(`✅ PDF rendered (${signedBuffer.length} bytes), uploading to Cloudinary…`);

    // Upload signed PDF to Cloudinary
    const uploadResult = await uploadBufferToCloudinary(signedBuffer, {
      folder: "SealScript_DEV/signed",
      resource_type: "raw",
      format: "pdf",
      public_id: `signed_${fileId}_${Date.now()}`,
    });
    console.log(`☁️  embedPublic: uploaded → ${uploadResult.secure_url}`);

    // Persist SignatureRecord per signature
    for (const sig of signatures) {
      const meta = sig.metadata || {};
      await SignatureRecord.create({
        fileId,
        signedPdfUrl: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        ipAddress: meta.ipAddress && meta.ipAddress !== "unknown" ? meta.ipAddress : userIp,
        timestamp: meta.timestamp ? new Date(meta.timestamp) : new Date(),
        signatureType: meta.signatureType || "drawn",
        signerEmail: signRequest.signerEmail,
        pageIndex: sig.pageIndex || 0,
      });
    }

    // Burn the invite token
    signRequest.used = true;
    await signRequest.save();

    file.isSigned = true; 
    file.status = "Signed"; // Agar tumhare schema me status field hai toh
    await file.save();

    console.log(`✅ Public sign complete for file ${fileId} by ${signRequest.signerEmail}`);

    return res.status(200).json({
      success: true,
      signedUrl: uploadResult.secure_url,
    });
  } catch (err) {
    console.error("❌ signController.embedPublic error:", err);
    return res.status(500).json({ message: "Server error during public PDF signing." });
  }
};


