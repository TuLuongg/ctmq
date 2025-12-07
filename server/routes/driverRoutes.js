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
  deleteAllDrivers
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
    if (req.files?.licenseImage?.[0]) {
      req.body.licenseImage = await uploadToCloudinary(
        req.files.licenseImage[0].buffer,
        "drivers/license"
      );
    }

    if (req.files?.licenseImageCCCD?.[0]) {
      req.body.licenseImageCCCD = await uploadToCloudinary(
        req.files.licenseImageCCCD[0].buffer,
        "drivers/cccd"
      );
    }

    next();
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Upload image failed", error: err });
  }
}

// --------------------------
// Routes
// --------------------------
router.get("/", listDrivers);
router.get("/:id", getDriver);

// CREATE
router.post(
  "/",
  imageUpload.fields([
    { name: "licenseImage", maxCount: 1 },
    { name: "licenseImageCCCD", maxCount: 1 }
  ]),
  handleImageUpload,
  createDriver
);

// UPDATE
router.put(
  "/:id",
  imageUpload.fields([
    { name: "licenseImage", maxCount: 1 },
    { name: "licenseImageCCCD", maxCount: 1 }
  ]),
  handleImageUpload,
  updateDriver
);

// Delete
router.delete("/:id", deleteDriver);

// Delete all drivers
router.delete("/all", deleteAllDrivers);

// Import Excel
router.post("/import", excelUpload.single("file"), importDriversFromExcel);

// List names
router.get("/names/list", listDriverNames);

router.put("/warning/:id", toggleWarning);

module.exports = router;
