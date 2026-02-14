const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");
const multer = require('multer');
const {storage} = require("../cloudinary");
const upload = multer({storage});
const auth = require("../middleware/auth");

router.post('/upload',auth, upload.single('myFile'), fileController.upload);

module.exports = router;