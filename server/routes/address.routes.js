// routes/address.routes.js
const express = require("express");
const multer = require("multer");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const {
  getAddressesPaginated,
  importAddressExcel,
  clearAllAddresses,
} = require("../controllers/address.controller");

router.get("/", getAddressesPaginated);
router.post("/import-excel", upload.single("file"), importAddressExcel);
router.delete("/clear", clearAllAddresses);

module.exports = router;
