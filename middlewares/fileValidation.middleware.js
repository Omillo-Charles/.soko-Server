/**
 * Middleware to validate uploaded file types
 * @param {Array<string>} allowedMimeTypes - Array of allowed MIME types
 * @returns {function} Express middleware
 */
export const validateFileType = (allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']) => {
  return (req, res, next) => {
    try {
      // Check single file upload
      if (req.file) {
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          const error = new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
          error.statusCode = 400;
          throw error;
        }
      }

      // Check multiple file uploads
      if (req.files) {
        // Handle array of files
        if (Array.isArray(req.files)) {
          for (const file of req.files) {
            if (!allowedMimeTypes.includes(file.mimetype)) {
              const error = new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
              error.statusCode = 400;
              throw error;
            }
          }
        } 
        // Handle object of file arrays (from upload.fields())
        else if (typeof req.files === 'object') {
          for (const fieldName in req.files) {
            for (const file of req.files[fieldName]) {
              if (!allowedMimeTypes.includes(file.mimetype)) {
                const error = new Error(`Invalid file type for ${fieldName}. Allowed types: ${allowedMimeTypes.join(', ')}`);
                error.statusCode = 400;
                throw error;
              }
            }
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Preset validators
export const validateImageUpload = validateFileType(['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']);
export const validateMediaUpload = validateFileType([
  'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/x-msvideo'
]);
