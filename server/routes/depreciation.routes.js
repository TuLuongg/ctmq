const express = require("express");
const router = express.Router();
const multer = require("multer");

const depreciationController = require("../controllers/depreciation.controller");

// upload Excel (dùng memoryStorage giống mấy module khác)
const upload = multer({ storage: multer.memoryStorage() });

/* =======================
   CRUD & LIST
======================= */

// Lấy tất cả (có filter theo mảng mã TSCĐ)
router.get("/", depreciationController.getAll);

// Lấy danh sách mã TSCĐ duy nhất
router.get("/unique-matscd", depreciationController.getUniqueMaTSCD);

// Thêm 1 bản ghi
router.post("/", depreciationController.create);

// Sửa
router.put("/:id", depreciationController.update);

// Xoá 1
router.delete("/:id", depreciationController.remove);

// Xoá tất cả
router.delete("/", depreciationController.removeAll);

/* =======================
   IMPORT EXCEL
======================= */

// FE truyền mode = 1 (ghi đè) | 2 (chỉ thêm mới)
router.post(
  "/import-excel",
  upload.single("file"),
  depreciationController.importExcel
);

module.exports = router;
