const express = require("express");
const router = express.Router();
const VehicleLegalController = require("../controllers/vehicleLegal.controller");
const multer = require("multer");
const upload = multer(); // Lưu file vào memory, dùng buffer

// =======================
// LẤY DỮ LIỆU
// =======================
router.get("/", VehicleLegalController.getAll);

// Lấy danh sách biển số xe duy nhất
router.get("/vehicleNos", VehicleLegalController.getUniqueVehicleNos);

// =======================
// CRUD
// =======================
router.post("/", VehicleLegalController.create);       // Thêm mới
router.put("/:id", VehicleLegalController.update);    // Sửa
router.delete("/:id", VehicleLegalController.remove); // Xoá 1
router.delete("/", VehicleLegalController.removeAll); // Xoá tất cả

// =======================
// IMPORT EXCEL
// =======================
router.post("/import", upload.single("file"), VehicleLegalController.importExcel);

module.exports = router;
