const File = require("../models/File");

exports.upload = async (req, res) => {
  try {
    const data = req.file;
    if (!data) {
      return res.status(400).json({ message: "File not found" });
    }

    console.log("Original Cloudinary Data:", data);
    const cleanFileName = data.filename.split("/").pop();
    // --- MAIN CHANGE END ---

    const user = req.user.userId;

    let file = new File({
      fileName: cleanFileName, 
      fileUrl: data.path,
      cloudinaryId: data.filename, 
      uploadedBy: user,
    });

    console.log("Saving File to DB:", file);

    await file.save();

    res.status(200).json({ success: "Uploaded Success", path: data.path });
  } catch (e) {
    console.error("Upload Error:", e);
    res.status(500).json({ message: "Server Error during upload" });
  }
};

exports.get = async (req, res) => {
  try {
    const files = await File.find({}).sort({ createdAt: -1 });

    if (!files || files.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No files found",
        files: [],
      });
    }
    console.log(files);
    res.status(200).json({
      success: true,
      count: files.length,
      message: "Got the Files",
      files: files,
    });
  } catch (err) {
    console.log("Get API Error : ", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getById = async (req, res) => {
  try{
    const { id } = req.params;
    const file = await File.findById(id);
    if(!file){
      return res.status(404).json({message : "File Not Found !"});
    }
    res.send(200).json({message : "Got the file", file : file});
  }catch(err){
    console.log("Get Id Api Error ",err);
    res.status(500).json({message : "Server Error"});
  }
}