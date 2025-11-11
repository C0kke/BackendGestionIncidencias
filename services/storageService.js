const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();
const path = require('path');

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'GestionIncidencias', 
    allowedFormats: ['jpeg', 'png', 'jpg', 'gif'],
    transformation: [{ width: 400, height: 400, crop: 'limit' }],
    public_id: (req, file) => {
        const fileName = path.basename(file.originalname, path.extname(file.originalname));
        return `GI_${Date.now()}_${fileName}`;
    }, 
  },
});

const uploadMiddleware = multer({ storage: storage });

module.exports = uploadMiddleware;