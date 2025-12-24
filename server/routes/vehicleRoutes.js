// routes/vehicles.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  importVehiclesFromExcel,
  listVehicleNames,
  toggleWarning,
  deleteAllVehicles,
} = require("../controllers/vehicleController");
const cloudinary = require("../config/cloudinary"); // file config cloudinary
const { Readable } = require("stream");

// --------------------------
// Multer MemoryStorage (lưu file tạm trong RAM)
// --------------------------
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

// --------------------------
// Helper upload file lên Cloudinary
// --------------------------
async function uploadToCloudinary(buffer, folder = "vehicles") {
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
// Routes
// --------------------------
router.get("/", listVehicles);
router.get("/:id", getVehicle);

router.post(
  "/",
  upload.fields([
    { name: "registrationImage", maxCount: 5 }, // nhận tối đa 10 ảnh
    { name: "inspectionImage", maxCount: 5 },
  ]),
  async (req, res, next) => {
    try {
      const files = req.files || {};

      // Upload từng file lên Cloudinary và tạo mảng URL
      if (files.registrationImage?.length) {
        req.body.registrationImage = await Promise.all(
          files.registrationImage.map(f => uploadToCloudinary(f.buffer))
        );
      }

      if (files.inspectionImage?.length) {
        req.body.inspectionImage = await Promise.all(
          files.inspectionImage.map(f => uploadToCloudinary(f.buffer))
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  },
  createVehicle
);

router.put(
  "/:id",
  upload.fields([
    { name: "registrationImage", maxCount: 5 },
    { name: "inspectionImage", maxCount: 5 },
  ]),
  async (req, res, next) => {
    try {
      const files = req.files || {};

      if (files.registrationImage?.length) {
        req.body.registrationImage = await Promise.all(
          files.registrationImage.map(f => uploadToCloudinary(f.buffer))
        );
      }

      if (files.inspectionImage?.length) {
        req.body.inspectionImage = await Promise.all(
          files.inspectionImage.map(f => uploadToCloudinary(f.buffer))
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  },
  updateVehicle
);


router.delete("/all", deleteAllVehicles);
router.delete("/:id", deleteVehicle);

// Import Excel (MemoryStorage)
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });
router.post("/import", excelUpload.single("file"), importVehiclesFromExcel);

router.get("/names/list", listVehicleNames);
router.put("/warning/:id", toggleWarning)

module.exports = router;
