const express = require("express");
const router = express.Router();
const multer = require("multer");
const { Readable } = require("stream");
const {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  importDriversFromExcel,
  listDriverNames,
  toggleWarning,
  deleteAllDrivers,
  exportDrivers
} = require("../controllers/driverController");

const cloudinary = require("../config/cloudinary");

// --------------------------
// Multer: dùng MemoryStorage cho ảnh
// --------------------------
const imageUpload = multer({ storage: multer.memoryStorage() });

// Excel upload
const excelUpload = multer({ storage: multer.memoryStorage() });

// --------------------------
// Upload buffer lên Cloudinary
// --------------------------
async function uploadToCloudinary(buffer, folder = "drivers") {
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

// --------------------------
// Middleware xử lý upload ảnh
// --------------------------
async function handleImageUpload(req, res, next) {
  try {
    // ===== GPLX =====
    if (Array.isArray(req.files?.licenseImage)) {
      const urls = [];

      for (const file of req.files.licenseImage) {
        const url = await uploadToCloudinary(file.buffer, "drivers/license");
        urls.push(url);
      }

      req.body.licenseImage = urls;
    }

    // ===== CCCD =====
    if (Array.isArray(req.files?.licenseImageCCCD)) {
      const urls = [];

      for (const file of req.files.licenseImageCCCD) {
        const url = await uploadToCloudinary(file.buffer, "drivers/cccd");
        urls.push(url);
      }

      req.body.licenseImageCCCD = urls;
    }

    next();
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({
      message: "Upload image failed",
      error: err.message,
    });
  }
}

// --------------------------
// Routes
// --------------------------
router.get("/", listDrivers);
router.get("/export-excel", exportDrivers);
router.get("/:id", getDriver);

// CREATE
router.post(
  "/",
  imageUpload.fields([
    { name: "licenseImage", maxCount: 5 },
    { name: "licenseImageCCCD", maxCount: 5 },
  ]),
  handleImageUpload,
  createDriver
);

// UPDATE
router.put(
  "/:id",
  imageUpload.fields([
    { name: "licenseImage", maxCount: 5 },
    { name: "licenseImageCCCD", maxCount: 5 },
  ]),
  handleImageUpload,
  updateDriver
);

// Delete all drivers
router.delete("/all", deleteAllDrivers);

// Delete
router.delete("/:id", deleteDriver);

// Import Excel
router.post("/import", excelUpload.single("file"), importDriversFromExcel);

// List names
router.get("/names/list", listDriverNames);

router.put("/warning/:id", toggleWarning);

module.exports = router;
