const express = require("express");
const multer = require("multer");
const upload = multer();

const ctrl = require("../controllers/epassTurn.controller");

const router = express.Router();

/* ================= CRUD ================= */
router.get("/", ctrl.getAll);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.delete("/", ctrl.removeAll);

/* ================= FILTER ================= */
router.get("/unique-bsx", ctrl.getUniqueBsx);

/* ================= IMPORT ================= */
router.post(
  "/import-excel",
  upload.single("file"),
  ctrl.importExcel
);

module.exports = router;
