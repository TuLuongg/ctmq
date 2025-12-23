const express = require("express");
const router = express.Router();
const multer = require("multer");

// =========================
// 📦 MULTER (IMPORT EXCEL)
// =========================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// =========================
// 🎯 CONTROLLERS
// =========================
const {
  createTripPaymentKT,
  updateTripPaymentKT,
  deleteTripPaymentKT,
  getAllTripPaymentKT,
  getUniqueDriverNames,
  getUniqueLicensePlates,
  deleteByDateRange,
  importTripPaymentKTExcel,
} = require("../controllers/tripPaymentKT.controller");

// =========================
// ➕ CRUD
// =========================

// Thêm
router.post("/", createTripPaymentKT);

// Sửa
router.put("/:id", updateTripPaymentKT);

// =========================
// 🗑 XOÁ THEO KHOẢNG NGÀY
// =========================
router.delete("/delete-by-date", deleteByDateRange);

// Xoá 1
router.delete("/:id", deleteTripPaymentKT);

// =========================
// 📋 DANH SÁCH + FILTER
// =========================

// Lấy tất cả (filter: from, to, tenLaiXe[], bienSoXe[])
router.get("/", getAllTripPaymentKT);

// Danh sách tên lái xe (unique)
router.get("/drivers", getUniqueDriverNames);

// Danh sách biển số xe (unique)
router.get("/plates", getUniqueLicensePlates);

// =========================
// 📥 IMPORT EXCEL
// =========================
router.post(
  "/import-excel",
  upload.single("file"),
  importTripPaymentKTExcel
);

module.exports = router;
