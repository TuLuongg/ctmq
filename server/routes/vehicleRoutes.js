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
  toggleWarning
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
    { name: "registrationImage", maxCount: 1 },
    { name: "inspectionImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const files = req.files || {};

      // Upload từng file lên Cloudinary
      if (files.registrationImage?.[0]) {
        req.body.registrationImage = await uploadToCloudinary(files.registrationImage[0].buffer);
      }
      if (files.inspectionImage?.[0]) {
        req.body.inspectionImage = await uploadToCloudinary(files.inspectionImage[0].buffer);
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
    { name: "registrationImage", maxCount: 1 },
    { name: "inspectionImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const files = req.files || {};

      if (files.registrationImage?.[0]) {
        req.body.registrationImage = await uploadToCloudinary(files.registrationImage[0].buffer);
      }
      if (files.inspectionImage?.[0]) {
        req.body.inspectionImage = await uploadToCloudinary(files.inspectionImage[0].buffer);
      }

      next();
    } catch (err) {
      next(err);
    }
  },
  updateVehicle
);

router.delete("/:id", deleteVehicle);

// Import Excel (MemoryStorage)
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });
router.post("/import", excelUpload.single("file"), importVehiclesFromExcel);

router.get("/names/list", listVehicleNames);
router.put("/warning/:id", toggleWarning)

module.exports = router;
