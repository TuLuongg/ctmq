const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // dùng memory storage để đọc buffer
const TCBController = require("../controllers/TCBperson.controller");

// ============================
// Thêm mới
// POST /tcbperson
// ============================
router.post("/", TCBController.create);

// ============================
// Sửa theo ID
// PUT /tcbperson/:id
// ============================
router.put("/:id", TCBController.update);

// ============================
// Xóa tất cả
// DELETE /tcbperson
// ============================
router.delete("/", TCBController.deleteAll);

// ============================
// Xóa 1 theo ID
// DELETE /tcbperson/:id
// ============================
router.delete("/:id", TCBController.deleteOne);

// ============================
// Lấy danh sách khách hàng duy nhất
// GET /tcbperson/customers
// ============================
router.get("/customers", TCBController.getCustomers);

// ============================
// Lấy danh sách kế toán duy nhất
// GET /tcbperson/accountants
// ============================
router.get("/accountants", TCBController.getAccountants);

// ============================
// Lấy tất cả dữ liệu với filter
// POST /tcbperson/all
// body: { khachHang: [], keToan: [], from, to }
// ============================
router.post("/all", TCBController.getAll);

// ============================
// Import Excel
// POST /tcbperson/import
// ============================
router.post("/import", upload.single("file"), TCBController.importExcel);

module.exports = router;
