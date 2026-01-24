const express = require("express");
const router = express.Router();
const multer = require("multer");
const { Readable } = require("stream");

const voucherController = require("../controllers/voucherController");
const cloudinary = require("../config/cloudinary");

// ==========================
// Multer memory (upload ảnh)
// ==========================
const imageUpload = multer({ storage: multer.memoryStorage() });

// ==========================
// Upload buffer lên Cloudinary
// ==========================
async function uploadToCloudinary(buffer, folder = "vouchers") {
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

// ==========================
// Middleware upload ảnh minh chứng
// ==========================
async function handleVoucherImageUpload(req, res, next) {
  try {
    if (Array.isArray(req.files?.attachments)) {
      const urls = [];

      for (const file of req.files.attachments) {
        const url = await uploadToCloudinary(
          file.buffer,
          "vouchers/attachments"
        );
        urls.push(url);
      }

      req.body.attachments = urls;
    }

    next();
  } catch (err) {
    console.error("Voucher upload error:", err);
    return res.status(500).json({
      message: "Upload voucher images failed",
      error: err.message,
    });
  }
}

/* =========================
   ROUTES
========================= */

// CREATE (có upload ảnh)
router.post(
  "/",
  imageUpload.fields([{ name: "attachments", maxCount: 10 }]),
  handleVoucherImageUpload,
  voucherController.createVoucher
);

// LIST
router.get("/", voucherController.getAllVouchers);

// EXPORT
router.get("/export", voucherController.exportVouchers);

// FILTER DATA
router.get("/expense-types", voucherController.getUniqueExpenseTypes);
router.get("/receiver-companies", voucherController.getUniqueReceiverCompanies);
router.get("/unique-receivers", voucherController.getUniqueReceivers);

// GET BY ID
router.get("/:id", voucherController.getVoucherById);

// UPDATE (có upload ảnh)
router.put(
  "/:id",
  imageUpload.fields([{ name: "attachments", maxCount: 10 }]),
  handleVoucherImageUpload,
  voucherController.updateVoucher
);

// DELETE
router.delete("/:id", voucherController.deleteVoucher);

// APPROVE
router.post("/:id/approve", voucherController.approveVoucher);

// ADJUST (có upload ảnh)
router.post(
  "/:id/adjust",
  imageUpload.fields([{ name: "attachments", maxCount: 10 }]),
  handleVoucherImageUpload,
  voucherController.adjustVoucher
);

// APPROVE ADJUST
router.post("/:id/approve-adjust", voucherController.approveAdjustedVoucher);

// BULK UPDATE
router.put("/transfer-date/bulk", voucherController.updateTransferDateBulk);

// PRINT
router.post("/:id/print", voucherController.printVoucher);

module.exports = router;
