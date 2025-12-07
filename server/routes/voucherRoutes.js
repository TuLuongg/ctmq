const express = require("express");
const router = express.Router();
const voucherController = require("../controllers/voucherController");

// Không phân quyền

router.post("/", voucherController.createVoucher);
router.get("/", voucherController.getAllVouchers);
router.get("/:id", voucherController.getVoucherById);
router.put("/:id", voucherController.updateVoucher);
router.delete("/:id", voucherController.deleteVoucher);

router.post("/:id/approve", voucherController.approveVoucher);
router.post("/:id/adjust", voucherController.adjustVoucher);
router.get("/:id/print", voucherController.printVoucher);

module.exports = router;
