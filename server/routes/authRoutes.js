const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  register,
  login,
  getAllUsers,
  adminCreate,
  deleteUser,
  getAllDieuVan,
  refreshToken,
  updateUserPermissions,
  updateProfile,
  adminResetPassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// --------------------------
// Multer MemoryStorage (lưu file tạm trong RAM)
// --------------------------
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

// --------------------------
// Helper upload file lên Cloudinary
// --------------------------
async function uploadToCloudinary(buffer, folder = "avatars") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

// 🔐 Routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/users', authMiddleware(['admin']), getAllUsers);
router.post('/admin-create', authMiddleware(['admin']), adminCreate);
router.delete('/users/:id', authMiddleware(['admin']), deleteUser);
router.get('/dieu-van', authMiddleware(), getAllDieuVan);
router.put("/users/:id/permissions", authMiddleware(['admin']), updateUserPermissions);
// 🔐 Admin reset mật khẩu user
router.put('/users/:id/reset-password', authMiddleware(['admin']), adminResetPassword);

router.put(
  "/profile",
  authMiddleware(["admin", "dieuVan", "keToan"]),
  upload.single("avatar"), // multer xử lý avatar
  async (req, res, next) => {
    try {
      if (req.file?.buffer) {
        req.body.avatar = await uploadToCloudinary(req.file.buffer, "avatars");
      }
      next(); // chuyển sang controller
    } catch (err) {
      next(err);
    }
  },
  updateProfile
);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);


module.exports = router;
