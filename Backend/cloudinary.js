const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_API, 
  api_secret: process.env.CLOUD_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary : cloudinary,
    params : {
        folder : 'SealScript_DEV',
        resource_type: 'raw',
        allowed_formats: ['pdf'],
        public_id: (req, file) => {
            const name = file.originalname.split('.')[0]; 
            return `${name}_${Date.now()}.pdf`; 
        }
    }
});

module.exports = {cloudinary, storage}