const File = require("../models/File");

exports.upload = async (req, res)=>{
    try{
    const data = req.file;
    if(!data){
        return res.status(404).json({message : "File not found"});
    }
    console.log(data);
    const user = req.user.userId;
    let file = new File({
        fileName : data.filename,
        fileUrl : data.path,
        cloudinaryId : data.fieldname,
        uploadedBy : user
    });
    console.log(file);
    await file.save();
    res.status(200).json({success : 'Uploaded Success', path : data.path});
    }catch(e){
        console.log(e);
    }
}