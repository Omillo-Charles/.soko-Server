import { v2 as cloudinary } from 'cloudinary';
import pkg from 'multer-storage-cloudinary';
import multer from 'multer';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from './env.js';
const CloudinaryStorageCtor = pkg.CloudinaryStorage || pkg.default || pkg;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorageCtor({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'duuka/others';
    // Default transformation: compress and fit within 1000x1000
    let transformation = [
      { width: 1000, height: 1000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
    ];

    if (file.fieldname === 'image') {
      folder = 'duuka/products';
      transformation = [
        { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ];
    } else if (file.fieldname === 'avatar') {
      folder = 'duuka/avatars';
      transformation = [
        { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }
      ];
    } else if (file.fieldname === 'banner') {
      folder = 'duuka/banners';
      transformation = [
        { width: 1200, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
      ];
    }

    return {
      folder: folder,
      transformation: transformation,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    };
  },
});

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
export { cloudinary };
