const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // Lưu file trong memory
const tireController = require("../controllers/tire.controller.js"); // controller đã viết

// =======================
// Lấy tất cả dữ liệu (có filter theo mảng biển số)
// query: ?vehiclePlates=["31A-123","29C-456"]
// =======================
router.get("/", tireController.getAll);

// =======================
// Lấy danh sách biển số xe duy nhất
// =======================
router.get("/unique-plates", tireController.getUniqueVehiclePlates);

// =======================
// Thêm 1 bản ghi
// =======================
router.post("/", tireController.create);

// =======================
// Sửa 1 bản ghi theo ID
// =======================
router.put("/:id", tireController.update);

// =======================
// Xoá 1 bản ghi theo ID
// =======================
router.delete("/:id", tireController.remove);

// =======================
// Xoá tất cả bản ghi
// =======================
router.delete("/", tireController.removeAll);

// =======================
// Import Excel
// Form field: file
// =======================
router.post("/import-excel", upload.single("file"), tireController.importExcel);

module.exports = router;
