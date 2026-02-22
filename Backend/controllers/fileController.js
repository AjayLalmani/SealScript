const File = require("../models/File");
const SignatureRecord = require("../models/SignatureRecord");
const SignRequest = require("../models/SignRequest");
const mongoose = require("mongoose");
const { cloudinary } = require("../cloudinary");

exports.upload = async (req, res) => {
  try {
    const data = req.file;
    if (!data) {
      return res.status(400).json({ message: "File not found" });
    }

    console.log("Original Cloudinary Data:", data);
    const cleanFileName = data.filename.split("/").pop();

    const user = req.user.userId;

    let file = new File({
      fileName: cleanFileName, 
      fileUrl: data.path,
      cloudinaryId: data.filename, 
      uploadedBy: user,
    });

    console.log("Saving File to DB:", file);

    await file.save();

    res.status(200).json({ success: "Uploaded Success", path: data.path, fileId: file._id });
  } catch (e) {
    console.error("Upload Error:", e);
    res.status(500).json({ message: "Server Error during upload" });
  }
};

exports.get = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch only this user's files
    const files = await File.find({ uploadedBy: userId }).sort({ createdAt: -1 });

    if (!files || files.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No files found",
        files: [],
      });
    }

    const fileIds = files.map((f) => f._id);

    // Aggregate SignatureRecords: get the most-recent signed record per fileId
    const signatureRecords = await SignatureRecord.aggregate([
      { $match: { fileId: { $in: fileIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$fileId",
          signedPdfUrl: { $first: "$signedPdfUrl" },
          signedAt: { $first: "$createdAt" },
          signatureType: { $first: "$signatureType" },
        },
      },
    ]);

    // Build a quick lookup map: fileId (string) → signature info
    const signedMap = new Map(
      signatureRecords.map((r) => [r._id.toString(), r])
    );

    // Fetch SignRequests to check for rejections
    const rejectedRequests = await SignRequest.find({
      fileId: { $in: fileIds },
      status: "rejected"
    });
    const rejectedSet = new Set(rejectedRequests.map(r => r.fileId.toString()));

    // Enrich each file with signature and rejection status
    const enrichedFiles = files.map((f) => {
      const sigInfo = signedMap.get(f._id.toString());
      return {
        ...f.toObject(),
        isSigned: !!sigInfo,
        signedPdfUrl: sigInfo?.signedPdfUrl ?? null,
        signedAt: sigInfo?.signedAt ?? null,
        signatureType: sigInfo?.signatureType ?? null,
        isRejected: rejectedSet.has(f._id.toString()),
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedFiles.length,
      message: "Got the Files",
      files: enrichedFiles,
    });
  } catch (err) {
    console.log("Get API Error : ", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ message: "File Not Found !" });
    }
    res.status(200).json({ message: "Got the file", file: file });
  } catch (err) {
    console.log("Get Id Api Error ", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find the file and confirm ownership
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }
    if (file.uploadedBy.toString() !== userId) {
      return res.status(403).json({ message: "Not authorised to delete this file." });
    }

    // Delete all SignatureRecords for this file and their Cloudinary signed PDFs
    const records = await SignatureRecord.find({ fileId: id });
    for (const record of records) {
      try {
        await cloudinary.uploader.destroy(record.cloudinaryId, { resource_type: "raw" });
        console.log("🗑️  Deleted signed PDF from Cloudinary:", record.cloudinaryId);
      } catch (err) {
        console.warn("⚠️  Could not delete signed PDF from Cloudinary:", err.message);
      }
    }
    await SignatureRecord.deleteMany({ fileId: id });

    // Delete the original PDF from Cloudinary
    try {
      await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "raw" });
      console.log("🗑️  Deleted original PDF from Cloudinary:", file.cloudinaryId);
    } catch (err) {
      console.warn("⚠️  Could not delete original PDF from Cloudinary:", err.message);
    }

    // Delete the File document from MongoDB
    await File.findByIdAndDelete(id);

    console.log("✅ File deleted:", id);
    res.status(200).json({ success: true, message: "File deleted successfully." });
  } catch (err) {
    console.error("Delete File Error:", err);
    res.status(500).json({ message: "Server Error during deletion." });
  }
};