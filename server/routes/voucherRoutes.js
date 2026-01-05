const express = require("express");
const router = express.Router();
const voucherController = require("../controllers/voucherController");

// Không phân quyền
router.post("/", voucherController.createVoucher);
router.get("/", voucherController.getAllVouchers);
// ==========================
// Xuất Excel theo khoảng tháng tùy chọn
// FE gửi query: fromMonth=yyyy-MM, toMonth=yyyy-MM
// ==========================
router.get("/export", voucherController.exportVouchers);
router.get("/:id", voucherController.getVoucherById);
router.put("/:id", voucherController.updateVoucher);
router.delete("/:id", voucherController.deleteVoucher);

router.post("/:id/approve", voucherController.approveVoucher);
router.post("/:id/adjust", voucherController.adjustVoucher);
router.post("/:id/approve-adjust", voucherController.approveAdjustedVoucher);
router.put("/transfer-date/bulk", voucherController.updateTransferDateBulk);
router.post("/:id/print", voucherController.printVoucher);

module.exports = router;
