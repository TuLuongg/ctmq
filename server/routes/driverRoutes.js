// routes/drivers.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  importDriversFromExcel,
  listDriverNames
} = require("../controllers/driverController");

// --------------------------
// DiskStorage cho hình ảnh
// --------------------------
const imageUploadPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(imageUploadPath)) fs.mkdirSync(imageUploadPath, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageUploadPath);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const imageUpload = multer({ storage: imageStorage });

// --------------------------
// MemoryStorage cho Excel
// --------------------------
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });

// --------------------------
// Routes
// --------------------------
router.get("/", listDrivers);
router.get("/:id", getDriver);
// upload nhiều file cùng lúc
router.post(
  "/",
  imageUpload.fields([
    { name: "licenseImage", maxCount: 1 },
    { name: "licenseImageCCCD", maxCount: 1 }
  ]),
  createDriver
);

router.put(
  "/:id",
  imageUpload.fields([
    { name: "licenseImage", maxCount: 1 },
    { name: "licenseImageCCCD", maxCount: 1 }
  ]),
  updateDriver
);

router.delete("/:id", deleteDriver);

// Import Excel (MemoryStorage)
router.post("/import", excelUpload.single("file"), importDriversFromExcel);
router.get("/names/list", listDriverNames);

module.exports = router;
