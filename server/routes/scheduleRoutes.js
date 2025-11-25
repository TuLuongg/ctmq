const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

// Tạo mới
router.post("/", scheduleController.createSchedule);

// Lấy theo ngày
router.get("/", scheduleController.getSchedulesByDate);

// Lấy theo khoảng
router.get("/range", scheduleController.getSchedulesByRange);

// Xóa theo ngày
router.delete("/", scheduleController.deleteSchedulesByDate);

// Xóa theo khoảng
router.delete("/range", scheduleController.deleteSchedulesByRange);

// Xuất Excel theo ngày
router.get("/export", scheduleController.exportSchedule);

// Xuất Excel theo khoảng
router.get("/export-range", scheduleController.exportScheduleRange);

module.exports = router;
