const express = require("express");
const router = express.Router();
const ETCController = require("../controllers/etc.controller");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() }); // dùng memory storage cho Excel
// =======================
// LẤY TẤT CẢ DỮ LIỆU
// query: ?month=12&year=2025
// =======================
router.get("/", ETCController.getAll);

// =======================
// LẤY DANH SÁCH nameDV DUY NHẤT
// =======================
router.get("/unique-services", ETCController.getUniqueServices);

// =======================
// THÊM 1 BẢN GHI
// =======================
router.post("/", ETCController.create);

// =======================
// SỬA 1 BẢN GHI
// =======================
router.put("/:id", ETCController.update);

// =======================
// XOÁ 1 BẢN GHI
// =======================
router.delete("/:id", ETCController.remove);

// =======================
// XOÁ TẤT CẢ
// =======================
router.delete("/", ETCController.removeAll);

// =======================
// IMPORT EXCEL
// =======================
router.post("/import", upload.single("file"), ETCController.importExcel);

module.exports = router;
