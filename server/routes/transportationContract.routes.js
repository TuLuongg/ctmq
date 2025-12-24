const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // dùng memory storage
const transportationContractController = require("../controllers/transportationContract.controller");

/* =======================
   LẤY TẤT CẢ HỢP ĐỒNG (có filter theo khachHangArr)
   GET /contracts?khachHangArr=["KH1","KH2"]
======================= */
router.get("/", transportationContractController.getAll);

/* =======================
   LẤY DANH SÁCH KHÁCH HÀNG DUY NHẤT
   GET /contracts/unique-customers
======================= */
router.get("/unique-customers", transportationContractController.getUniqueCustomers);

/* =======================
   THÊM 1 HỢP ĐỒNG
   POST /contracts
======================= */
router.post("/", transportationContractController.create);

/* =======================
   SỬA HỢP ĐỒNG
   PUT /contracts/:id
======================= */
router.put("/:id", transportationContractController.update);

/* =======================
   XOÁ TẤT CẢ HỢP ĐỒNG
   DELETE /contracts
======================= */
router.delete("/", transportationContractController.removeAll);


/* =======================
   XOÁ 1 HỢP ĐỒNG
   DELETE /contracts/:id
======================= */
router.delete("/:id", transportationContractController.remove);

/* =======================
   IMPORT EXCEL
   POST /contracts/import
   field name: "file"
======================= */
router.post(
  "/import",
  upload.single("file"),
  transportationContractController.importExcel
);

router.patch("/:id/toggle-lock", transportationContractController.toggleLockContract);

module.exports = router;
