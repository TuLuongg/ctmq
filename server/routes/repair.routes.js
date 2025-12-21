const express = require("express");
const router = express.Router();
const repairController = require("../controllers/repair.controller");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() }); // dùng memory storage cho Excel

/* =======================
   LẤY TẤT CẢ (có filter)
======================= */
router.get("/", repairController.getAll);

/* =======================
   LẤY DANH SÁCH vehiclePlate DUY NHẤT
======================= */
router.get("/unique-vehiclePlates", repairController.getUniqueVehiclePlates);

/* =======================
   LẤY DANH SÁCH repairUnit DUY NHẤT
======================= */
router.get("/unique-repairUnits", repairController.getUniqueRepairUnits);

/* =======================
   THÊM
======================= */
router.post("/", repairController.create);

/* =======================
   SỬA
======================= */
router.put("/:id", repairController.update);

/* =======================
   XOÁ 1
======================= */
router.delete("/:id", repairController.remove);

/* =======================
   XOÁ TẤT CẢ
======================= */
router.delete("/", repairController.removeAll);

/* =======================
   IMPORT EXCEL
======================= */
router.post("/import", upload.single("file"), repairController.importExcel);

module.exports = router;
