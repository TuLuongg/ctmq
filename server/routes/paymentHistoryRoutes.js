const express = require("express");
const router = express.Router();

const {
  // ===== CÔNG NỢ THEO KỲ (KH CHUNG ≠ 26) =====
  getCustomerDebt,
  createDebtPeriod,
  getDebtPeriodDetail,
  updateDebtPeriod,
  lockDebtPeriod,
  unlockDebtPeriod,
  toggleTripPaymentType,
  deleteDebtPeriod,
  removeTripFromDebtPeriod,
  addTripToDebtPeriod,
  getCustomerDebtPeriodsByYear,
  exportCustomerDebtByMonth,

  // ===== PHIẾU THU CÔNG NỢ =====
  addPaymentReceipt,
  rollbackPaymentReceipt,
  getPaymentHistoryByCustomer,
} = require("../controllers/paymentHistoryController");

// =====================================================
// 📌 CÔNG NỢ THEO KỲ (KH CHUNG)
// =====================================================

// Danh sách công nợ theo tháng / năm
// GET /api/payment/debt?month=11&year=2025
router.get("/debt", getCustomerDebt);
router.get("/customer/:customerCode/debt-periods-by-year", getCustomerDebtPeriodsByYear);

// Xuất excel công nợ theo tháng
// GET /api/payment/debt-period/export?month=11&year=2025
router.get("/debt-period/export", exportCustomerDebtByMonth);


// Tạo kỳ công nợ
// POST /api/payment/debt-period
router.post("/debt-period", createDebtPeriod);

// ✏️ SỬA KỲ CÔNG NỢ
// PUT /api/payment/debt-period/CN.BM.11.25
router.put("/debt-period/:debtCode", updateDebtPeriod);

// Chi tiết 1 kỳ công nợ (chuyến + phiếu thu)
// GET /api/payment/debt-period/CN.BM.11.25
router.get("/debt-period/:debtCode", getDebtPeriodDetail);

//Đổi cash-invoice cho chuyến
router.patch("/trip/:maChuyenCode/toggle-payment-type", toggleTripPaymentType);

//Xoá kỳ công nợ
router.delete("/delete/debt-period/:debtCode", deleteDebtPeriod)

//thêm-xoá chuyến của kỳ
router.delete("/debt-period/:debtCode/remove-trip/:maChuyen", removeTripFromDebtPeriod)
router.post("/debt-period/:debtCode/add-trip", addTripToDebtPeriod);

// =====================================================
// 💰 PHIẾU THU CÔNG NỢ
// =====================================================

// Lấy lịch sử phiếu thu KH chung
// GET /api/payment/receipt/history/:customerCode
router.get("/receipt/:customerCode/:debtCode", getPaymentHistoryByCustomer);

// Ghi nhận phiếu thu + tự động phân bổ tiền
// POST /api/payment/receipt
router.post("/add-receipt", addPaymentReceipt);

// =====================================================
// 🔐 KHOÁ KỲ CÔNG NỢ
// =====================================================
// POST /api/payment/debt-period/:debtCode/lock
router.post("/debt-period/:debtCode/lock", lockDebtPeriod);

// Mở khoá kỳ
// POST /api/payment/debt-period/:debtCode/unlock
router.post("/debt-period/:debtCode/unlock", unlockDebtPeriod);

// =====================================================
// 🔄 HUỶ PHIẾU THU
// =====================================================
// DELETE /api/payment/receipt/:receiptId
router.delete("/receipt/:receiptId", rollbackPaymentReceipt);

module.exports = router;
