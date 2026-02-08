const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

// Tạo mới
router.post("/", scheduleController.createSchedule);

// Lấy theo ngày
router.get("/", scheduleController.getSchedulesByDate);

// Lấy theo khoảng
router.get("/range", scheduleController.getSchedulesByRange);

// Lấy theo ngày tạo (createdAt)
router.get("/by-created-date", scheduleController.getSchedulesByCreatedDate);

// Lấy theo khoảng ngày tạo (createdAt)
router.get("/by-created-range", scheduleController.getSchedulesByCreatedRange);


// Xóa theo ngày
router.delete("/", scheduleController.deleteSchedulesByDate);

// Xóa theo khoảng
router.delete("/range", scheduleController.deleteSchedulesByRange);

// Xuất Excel theo ngày
router.get("/export", scheduleController.exportSchedule);

// Xuất Excel theo khoảng
router.get("/export-range", scheduleController.exportScheduleRange);

//XUẤT EXCEL THEO NGÀY TẠO (createdAt)
router.get("/export-by-created-date", scheduleController.exportScheduleByCreatedDate);

// XUẤT EXCEL THEO KHOẢNG NGÀY TẠO (createdAt)
router.get("/export-by-created-range", scheduleController.exportScheduleByCreatedRange);

module.exports = router;
