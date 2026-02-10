const express = require("express");
const router = express.Router();
const multer = require("multer");
const { Readable } = require("stream");

const voucherController = require("../controllers/voucherController");
const cloudinary = require("../config/cloudinary");
const path = require("path");


// Multer memory (upload file)
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 30,
  },
});


async function uploadToCloudinary(file, folder = "vouchers/attachments") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw", // ✅ CHÌA KHOÁ
        public_id: path.parse(file.originalname).name,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readable = new Readable();
    readable._read = () => {};
    readable.push(file.buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}


async function handleVoucherFileUpload(req, res, next) {
  try {
    if (Array.isArray(req.files?.attachments)) {
      const files = [];

      for (const file of req.files.attachments) {
        const result = await uploadToCloudinary(file);

        files.push({
          url: result.secure_url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });
      }

      req.body.attachments = files;
    }

    next();
  } catch (err) {
    console.error("Voucher upload error:", err);
    return res.status(500).json({
      message: "Upload voucher files failed",
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
  fileUpload.fields([{ name: "attachments", maxCount: 30 }]),
  handleVoucherFileUpload,
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
router.get("/download/:id/attachments/:index", voucherController.downloadVoucherAttachment);


// GET BY ID
router.get("/:id", voucherController.getVoucherById);

// UPDATE (có upload ảnh)
router.put(
  "/:id",
  fileUpload.fields([{ name: "attachments", maxCount: 30 }]),
  handleVoucherFileUpload,
  voucherController.updateVoucher
);

// DELETE
router.delete("/:id", voucherController.deleteVoucher);

// APPROVE
router.post("/:id/approve", voucherController.approveVoucher);

// ADJUST (có upload ảnh)
router.post(
  "/:id/adjust",
  fileUpload.fields([{ name: "attachments", maxCount: 30 }]),
  handleVoucherFileUpload,
  voucherController.adjustVoucher
);

// APPROVE ADJUST
router.post("/:id/approve-adjust", voucherController.approveAdjustedVoucher);

// BULK UPDATE
router.put("/transfer-date/bulk", voucherController.updateTransferDateBulk);

// PRINT
router.post("/:id/print", voucherController.printVoucher);

module.exports = router;
