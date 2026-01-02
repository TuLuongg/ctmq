const express = require("express");
const multer = require("multer");
const router = express.Router();

const upload = multer(); // dùng memoryStorage
const controller = require("../controllers/customer2.controller");

/**
 * =========================
 * GET ALL (NO PAGINATION)
 * =========================
 * GET /api/customer2/all
 */
router.get("/all", controller.getAllCustomer2);

/**
 * =========================
 * CREATE
 * =========================
 * POST /api/customer2
 */
router.post("/", controller.createCustomer2);

/**
 * =========================
 * IMPORT EXCEL
 * =========================
 * POST /api/customer2/import-excel
 */
router.post(
  "/import-excel",
  upload.single("file"),
  controller.importCustomer2Excel
);

/**
 * =========================
 * CLEAR ALL
 * =========================
 * DELETE /api/customer2/clear
 */
router.delete("/clear", controller.clearAllCustomer2);

/**
 * =========================
 * DELETE ONE
 * =========================
 * DELETE /api/customer2/:id
 */
router.delete("/:id", controller.deleteCustomer2);

module.exports = router;
