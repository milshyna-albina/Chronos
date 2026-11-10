const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');

if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  const types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (types.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type (allowed .jpeg / jpg / .png / gif).'), false);
  }
};

function createStorage(destDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const suffix = `${crypto.randomUUID()}`;
      cb(null, `${req.user.id}-${suffix}${ext}`);
    }
  });
}

const uploadAvatar = multer({
  storage: createStorage(avatarDir),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 } // 1 Mb
});

function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (!error) {
        return next();
      }
      if (error instanceof multer.MulterError) {
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(413).json({
              message: 'File is too large.'
            });
          case 'LIMIT_FILE_COUNT':
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              message: 'Too many files uploaded.'
            });
          default:
            return res.status(400).json({
              message: error.message
            });
        }
      }
      return res.status(400).json({
        message: error.message
      });
    });
  };
}

module.exports = {
  uploadAvatar: handleUpload(uploadAvatar.single('avatar'))
};