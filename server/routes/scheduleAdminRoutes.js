const express = require("express");
const router = express.Router();
const {
  createScheduleAdmin,
  updateScheduleAdmin,
  deleteScheduleAdmin,
  getAllSchedulesAdmin,
  getSchedulesByDieuVan,
  getSchedulesByAccountant,
  addHoaDonToSchedules,
  addBoSung,
  importSchedulesFromExcel,
  toggleWarning
} = require("../controllers/scheduleAdminController");
const authMiddleware = require("../middleware/authMiddleware");

const rideEditRequestController = require("../controllers/rideEditRequestController");

// 🧭 Route cấu hình đầy đủ quyền
router.post("/", authMiddleware(["admin", "dieuVan"]), createScheduleAdmin);
router.get("/all", authMiddleware(["admin", "dieuVan", "keToan"]), getAllSchedulesAdmin);
router.put("/:id", authMiddleware(["admin", "dieuVan", "keToan"]), updateScheduleAdmin);
router.delete("/:id", authMiddleware(["admin", "dieuVan"]), deleteScheduleAdmin);
router.get("/dieuvan/:dieuVanID", authMiddleware(["admin", "dieuVan"]), getSchedulesByDieuVan);

//chỉnh sửa + lưu lại lịch sử chuyến
router.post("/edit-request", authMiddleware(["dieuVan"]), rideEditRequestController.editRide);

// Lấy lịch sử chuyến
router.get("/history/:rideID", authMiddleware(["admin","dieuVan", "keToan"]), rideEditRequestController.getRideHistory);

// Lấy số lần chỉnh sửa
router.get("/history-count/:rideID", authMiddleware(["admin","dieuVan", "keToan"]), rideEditRequestController.getRideEditCount);

// Gửi yêu cầu chỉnh sửa chuyến
router.post("/edit-request-ke-toan", authMiddleware(["dieuVan", "keToan", "admin"]), rideEditRequestController.requestEditRide);

// Phê duyệt hoặc từ chối yêu cầu chỉnh sửa
router.post("/edit-process", authMiddleware(["admin", "dieuVan", "keToan"]), rideEditRequestController.processEditRideRequest);

router.get("/all-requests", authMiddleware(["admin", "keToan"]), rideEditRequestController.getEditRequests);

router.get("/count-pending", rideEditRequestController.getPendingEditRequestCount);

router.get("/my-requests", authMiddleware(["keToan"]), rideEditRequestController.getMyEditRequests);


// Lấy chuyến từ excel
router.post("/import-excel", authMiddleware(["admin","dieuVan"]), importSchedulesFromExcel);


// Lấy danh sách chuyến theo kế toán phụ trách
router.get("/accountant", authMiddleware(["keToan"]), getSchedulesByAccountant);

// Thêm mã hoá đơn cho chuyến
router.post("/add-hoa-don", authMiddleware(["keToan"]), addHoaDonToSchedules);

// Thêm cước phí bổ sung cho chuyến
router.post("/add-bo-sung", authMiddleware(["keToan"]), addBoSung);

router.put("/warning/:id", authMiddleware(["admin","dieuVan","keToan"]), toggleWarning);

module.exports = router;
