const express = require("express");
const router = express.Router();

const {
  getCustomerDebt,
  getPaymentHistory,
  addPayment,
  getCustomerTrips,
  getDebtForCustomer26,
  addTripPayment,
  getTripPaymentHistory
} = require("../controllers/paymentHistoryController");

// Tổng công nợ
router.get("/debt", getCustomerDebt);

// Lịch sử thanh toán
router.get("/history/:customerCode", getPaymentHistory);

// Thêm lần thanh toán
router.post("/add", addPayment);

// Lấy danh sách mã chuyến
router.get("/trips", getCustomerTrips);

// Công nợ khách 26
router.get("/customer26/debt", getDebtForCustomer26);

// Lấy lịch sử thanh toán theo chuyến
router.get("/trip/:maChuyenCode/history", getTripPaymentHistory);

// Thêm thanh toán theo chuyến
router.post("/trip/add", addTripPayment);

module.exports = router;
