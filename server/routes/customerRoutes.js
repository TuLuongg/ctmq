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
  exportCustomers
} = require("../controllers/customerController");

// --------------------------
// MemoryStorage cho Excel
// --------------------------
const excelStorage = multer.memoryStorage();
const excelUpload = multer({ storage: excelStorage });

// --------------------------
// Routes
// --------------------------
router.get("/", listCustomers);
router.get("/export-excel", exportCustomers);
router.get("/:id", getCustomer);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/all", deleteAllCustomers);
router.delete("/:id", deleteCustomer);

// Import Excel (MemoryStorage)
router.post("/import", excelUpload.single("file"), importCustomersFromExcel);
router.put("/warning/:id", toggleWarning)

router.get("/export-trips-customer/:maKH", exportTripsByCustomer);


module.exports = router;
