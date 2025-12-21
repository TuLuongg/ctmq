const express = require("express");
const multer = require("multer");
const upload = multer();

const ctrl = require("../controllers/epassMonth.controller");

const router = express.Router();

router.get("/", ctrl.getAll);
router.get("/unique-bsx", ctrl.getUniqueBSX);

router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.removeOne);
router.delete("/", ctrl.removeAll);

router.post("/import-excel", upload.single("file"), ctrl.importExcel);

module.exports = router;
