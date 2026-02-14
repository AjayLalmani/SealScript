const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  fileName : {
    type : String,
    required : true,
    trim : true,
  },
  fileUrl : {
    type : String,
    required : true,
  },
  cloudinaryId : {
    type : String,
    required : true
  },
  uploadedBy : {
    type : mongoose.Schema.Types.ObjectId,
    ref : 'User',
    required : true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("File", fileSchema);