const express = require("express");
const router = express.Router();

// controller
const oddDebtCtrl = require("../controllers/oddCustomerDebt.controller");

// ===============================
// 📌 CÔNG NỢ KHÁCH LẺ (KH = 26)
// ===============================

// 🔹 Tạo công nợ theo khoảng ngày
// POST /api/odd-debt/create
router.post("/create", oddDebtCtrl.createOddDebtByDate);

// 🔹 Sync / cập nhật lại tiền các chuyến trong công nợ
// POST /api/odd-debt/sync
router.post("/sync", oddDebtCtrl.syncOddDebtByDate);

// 🔹 Lấy danh sách công nợ KH lẻ
// GET /api/odd-debt?startDate=&endDate=&page=&limit=
router.get("/", oddDebtCtrl.getOddCustomerDebt);

// ===============================
// 📌 THANH TOÁN THEO CHUYẾN
// ===============================

// 🔹 Lịch sử thanh toán 1 chuyến
// GET /api/odd-debt/payment/:maChuyenCode
router.get("/payment/:maChuyenCode", oddDebtCtrl.getTripPaymentHistory);

// 🔹 Thêm thanh toán cho chuyến
// POST /api/odd-debt/payment
router.post("/payment", oddDebtCtrl.addTripPayment);

// 🔹 Xoá 1 lần thanh toán
// DELETE /api/odd-debt/payment/:paymentId
router.delete("/payment/:paymentId", oddDebtCtrl.deleteTripPayment);

// ===============================
// ✏️ CẬP NHẬT THÔNG TIN PHỤ
// ===============================

// 🔹 Cập nhật nameCustomer cho nhiều chuyến
// PUT /api/odd-debt/name-customer
router.put("/name-customer", oddDebtCtrl.updateTripNameCustomer);

// 🔹 Cập nhật noteOdd cho nhiều chuyến
// PUT /api/odd-debt/note
router.put("/note", oddDebtCtrl.updateTripNoteOdd);

// routes/schCustomerOdd.js
router.put("/update-money", oddDebtCtrl.updateOddTripMoney);

router.post("/sync-to-base-by-date", oddDebtCtrl.syncOddToBaseByDate);

router.put("/highlight", oddDebtCtrl.updateHighlight)



module.exports = router;
