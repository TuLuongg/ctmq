const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // upload buffer (không lưu file)

const salaryController = require("../controllers/salary.controller");

/* =======================
   LẤY DỮ LIỆU
   - ?month=2025-01
   - ?drivers=["A","B"]
======================= */
router.get("/", salaryController.getAll);

/* =======================
   LẤY DANH SÁCH TÊN LÁI XE DUY NHẤT
======================= */
router.get("/drivers", salaryController.getUniqueDrivers);

/* =======================
   THÊM
======================= */
router.post("/", salaryController.create);

/* =======================
   SỬA
======================= */
router.put("/:id", salaryController.update);

/* =======================
   XOÁ 1
======================= */
router.delete("/:id", salaryController.remove);

/* =======================
   XOÁ TẤT CẢ THEO THÁNG
   - ?month=2025-01
======================= */
router.delete("/", salaryController.removeAllByMonth);

/* =======================
   IMPORT EXCEL
======================= */
router.post(
  "/import-excel",
  upload.single("file"),
  salaryController.importExcel
);

module.exports = router;
