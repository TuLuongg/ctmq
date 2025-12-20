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

  // ===== PHIẾU THU CÔNG NỢ =====
  addPaymentReceipt,
  rollbackPaymentReceipt,
  getPaymentHistoryByCustomer,

  // ===== KH 26 – GIỮ NGUYÊN =====
  getDebtForCustomer26,
  addTripPayment,
  getTripPaymentHistory,
  deleteTripPayment,
  updateTripNameCustomer,
  updateTripNoteOdd
} = require("../controllers/paymentHistoryController");

// =====================================================
// 📌 CÔNG NỢ THEO KỲ (KH CHUNG)
// =====================================================

// Danh sách công nợ theo tháng / năm
// GET /api/payment/debt?month=11&year=2025
router.get("/debt", getCustomerDebt);

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

// =====================================================
// 🚚 KHÁCH HÀNG 26 (GIỮ NGUYÊN LOGIC CŨ)
// =====================================================

// Công nợ KH 26 theo từng chuyến
// GET /api/payment/customer26/debt?startDate=&endDate=
router.get("/customer26/debt", getDebtForCustomer26);

// Lịch sử thanh toán theo chuyến
// GET /api/payment/trip/BK11.0023/history
router.get("/trip/:maChuyenCode/history", getTripPaymentHistory);

// Thêm thanh toán theo chuyến
// POST /api/payment/trip/add
router.post("/trip/add", addTripPayment);

router.delete("/trip-payment/:paymentId", deleteTripPayment);

//Cập nhật tên KH và ghi chú
router.put("/update-name-customer", updateTripNameCustomer);
router.put("/update-note-odd", updateTripNoteOdd);


module.exports = router;
