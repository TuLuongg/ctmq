const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");
const {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomersFromExcel,
  toggleWarning,
  exportTripsByCustomer,
  deleteAllCustomers,
  exportCustomers,
  updateCustomerCommission,
  getCustomerCommissionHistory
} = require("../controllers/customerController");

// --------------------------
// MemoryStorage cho Excel
// --------------------------
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });

// ==============================
// 🔥 HOA HỒNG / LỊCH SỬ
// ==============================
router.post("/:id/commission", updateCustomerCommission);
router.get("/commission-history/:code", getCustomerCommissionHistory);

// --------------------------
// Routes CHUNG
// --------------------------
router.get("/", listCustomers);
router.get("/export-excel", exportCustomers);
router.post("/", createCustomer);
router.delete("/all", deleteAllCustomers);
router.post("/import", excelUpload.single("file"), importCustomersFromExcel);
router.put("/warning/:id", toggleWarning);
router.get("/export-trips-customer/:maKH", exportTripsByCustomer);

// ⛔ LUÔN ĐỂ CUỐI
router.get("/:id", getCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);




module.exports = router;
