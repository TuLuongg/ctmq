const RideHistory = require("../models/RideHistory");
const User = require("../models/User");
const ScheduleAdmin = require("../models/ScheduleAdmin");
const Schedule = require("../models/Schedule");
const RideEditRequest = require("../models/RideEditRequest");

// Chỉnh sửa chuyến và lưu lịch sử
exports.editRide = async (req, res) => {
  try {
    const { rideID, editorID, editorName, reason, newData } = req.body;
    console.log("FE gửi lên:", req.body);

    if (!rideID || !editorID || !editorName || !reason || !newData) {
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    const ride = await ScheduleAdmin.findById(rideID);
    if (!ride) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // Lưu dữ liệu cũ vào lịch sử
    await RideHistory.create({
      rideID: ride._id,
      editedByID: editorID,
      editedBy: editorName,
      reason,
      previousData: ride.toObject(),
      newData,
    });

    // Cập nhật chuyến với dữ liệu mới
    await ScheduleAdmin.findByIdAndUpdate(ride._id, newData, { new: true });

    res.json({ message: "Chuyến đã được chỉnh sửa và lưu lịch sử thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1️⃣ API lấy tất cả lịch sử của chuyến
exports.getRideHistory = async (req, res) => {
  try {
    const { rideID } = req.params;
    if (!rideID) return res.status(400).json({ error: "Thiếu rideID" });

    const history = await RideHistory.find({ rideID }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2️⃣ API lấy số lần chỉnh sửa (dùng cho FE hiển thị nút)
exports.getRideEditCount = async (req, res) => {
  try {
    const { rideID } = req.params;
    if (!rideID) return res.status(400).json({ error: "Thiếu rideID" });

    const count = await RideHistory.countDocuments({ rideID });
    res.json({ rideID, editCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Gửi yêu cầu chỉnh sửa chuyến
exports.requestEditRide = async (req, res) => {
  try {
    const { rideID, editorID, editorName, reason, newData } = req.body;

    if (!rideID || !editorID || !editorName || !reason || !newData) {
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    await RideEditRequest.create({
      rideID,
      requestedByID: editorID,
      requestedBy: editorName,
      reason,
      changes: newData,
      status: "pending",
    });

    res.json({
      success: true,
      message: "Yêu cầu chỉnh sửa đã gửi, chờ phê duyệt",
    });
  } catch (err) {
    console.error("Lỗi gửi yêu cầu chỉnh sửa:", err);
    res.status(500).json({ error: err.message });
  }
};

// ❌ Xoá yêu cầu chỉnh sửa (chỉ khi pending)
exports.deleteEditRideRequest = async (req, res) => {
  try {
    const { requestID } = req.params;

    if (!requestID) {
      return res.status(400).json({ error: "Thiếu requestID" });
    }

    const request = await RideEditRequest.findById(requestID);

    if (!request) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy yêu cầu chỉnh sửa" });
    }

    // ❗ Chỉ cho xoá khi chưa xử lý
    if (request.status !== "pending") {
      return res.status(400).json({
        error: "Không thể xoá yêu cầu đã được xử lý",
      });
    }

    await RideEditRequest.findByIdAndDelete(requestID);

    res.json({
      success: true,
      message: "Đã huỷ yêu cầu chỉnh sửa",
    });
  } catch (err) {
    console.error("Lỗi xoá yêu cầu chỉnh sửa:", err);
    res.status(500).json({ error: err.message });
  }
};

//Phê duyệt hoặc từ chối
exports.processEditRideRequest = async (req, res) => {
  try {
    const { requestID, action, note } = req.body;

    const approverID = req.user.id;

    // 🔥 LẤY FULL USER
    const approver =
      await User.findById(approverID).select("fullname username");

    const approverName = approver?.fullname || approver?.username || "Unknown";

    if (!requestID || !action) {
      return res.status(400).json({ error: "Thiếu dữ liệu đầu vào" });
    }

    const request = await RideEditRequest.findById(requestID);
    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Yêu cầu đã được xử lý trước đó" });
    }

    // Nếu là từ chối → không update vào chuyến
    if (action === "reject") {
      request.status = "rejected";
      request.rejectNote = note || "";
      await request.save();

      return res.json({
        success: true,
        message: "Đã từ chối yêu cầu chỉnh sửa",
      });
    }

    // Nếu là duyệt → cập nhật vào DB thật
    if (action === "approve") {
      const ride = await ScheduleAdmin.findById(request.rideID);
      if (!ride) {
        return res.status(404).json({ error: "Không tìm thấy chuyến" });
      }

      const previousData = ride.toObject();
      const changedFields = {};

      // 🔑 TÍNH DIFF THẬT
      for (const key of Object.keys(request.changes)) {
        const oldVal = ride[key];
        const newVal = request.changes[key];

        if (String(oldVal ?? "") !== String(newVal ?? "")) {
          changedFields[key] = {
            old: oldVal,
            new: newVal,
          };
        }

        // cập nhật chuyến
        ride[key] = newVal;
      }

      await ride.save();

      // lưu lịch sử
      await RideHistory.create({
        rideID: ride._id,
        editedByID: request.requestedByID,
        editedBy: request.requestedBy,
        approvedByID: approverID,
        approvedBy: approverName,
        reason: request.reason,
        previousData,
        newData: ride.toObject(),
      });

      // 🔥 LƯU DIFF VÀO REQUEST
      request.status = "approved";
      request.changedFields = changedFields;

      await request.save();

      return res.json({
        success: true,
        message: "Đã phê duyệt và cập nhật chuyến",
      });
    }

    return res
      .status(400)
      .json({ error: "action không hợp lệ (approve|reject)" });
  } catch (err) {
    console.error("Lỗi xử lý yêu cầu:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEditRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Lọc theo trạng thái
    if (status) filter.status = status;

    // Tìm kiếm
    if (search) {
      filter.$or = [
        { requestedBy: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 LẤY TOÀN BỘ (hoặc số đủ lớn), SORT TRƯỚC
    let allRequests = await RideEditRequest.find(filter)
      .populate("rideID")
      .sort({ createdAt: -1 }); // sort nền trước

    // 🔥 ƯU TIÊN pending
    allRequests.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // ✂️ CẮT PAGE SAU KHI SORT
    const requests = allRequests.slice(skip, skip + limitNum);

    const total = allRequests.length;

    res.json({
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalRecords: total,
      data: requests,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách yêu cầu chỉnh sửa:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /edit-requests/count-pending
exports.getPendingEditRequestCount = async (req, res) => {
  try {
    const count = await RideEditRequest.countDocuments({ status: "pending" });

    res.json({ count });
  } catch (err) {
    console.error("Lỗi lấy số lượng pending:", err);
    res.status(500).json({ error: err.message });
  }
};

// Lấy danh sách yêu cầu theo từng user
exports.getMyEditRequests = async (req, res) => {
  try {
    const userID = req.user.id;

    const { page = 1, limit = 20, status, search } = req.query;

    const skip = (page - 1) * limit;

    const filter = {
      requestedByID: userID,
    };

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { reason: { $regex: search, $options: "i" } },
        { requestedBy: { $regex: search, $options: "i" } },
      ];
    }

    const requests = await RideEditRequest.find(filter)
      .populate("rideID") // ⬅ LẤY FULL OBJECT CHUYẾN GỐC
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await RideEditRequest.countDocuments(filter);

    res.json({
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      data: requests,
    });
  } catch (err) {
    console.error("Lỗi lấy yêu cầu của user:", err);
    res.status(500).json({ error: err.message });
  }
};

// Lấy lịch trình tương ứng
exports.getRowByMaLichTrinh = async (req, res) => {
  try {
    const { maLichTrinh } = req.params;

    if (!maLichTrinh) {
      return res.status(400).json({ error: "Thiếu mã lịch trình" });
    }

    const schedule = await Schedule.findOne(
      { "rows.maLichTrinh": maLichTrinh },
      {
        tenLaiXe: 1,
        ngayDi: 1,
        ngayVe: 1,
        tongTienLichTrinh: 1,
        rows: { $elemMatch: { maLichTrinh } },
      },
    ).lean();

    if (!schedule || !schedule.rows || schedule.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy lịch trình" });
    }

    res.json({
      tenLaiXe: schedule.tenLaiXe,
      ngayDi: schedule.ngayDi,
      ngayVe: schedule.ngayVe,
      tongTienLichTrinh: schedule.tongTienLichTrinh,
      row: schedule.rows[0],
    });
  } catch (err) {
    console.error("Lỗi lấy row theo maLichTrinh:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===============================
// GÁN MÃ LỊCH TRÌNH VÀO CHUYẾN
// ===============================
exports.assignMaLichTrinh = async (req, res) => {
  try {
    const { maChuyen, maLichTrinh } = req.body;

    if (!maChuyen) {
      return res.status(400).json({ error: "Thiếu mã chuyến" });
    }

    const ride = await ScheduleAdmin.findOne({ maChuyen });
    if (!ride) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // ✅ Cho phép bỏ mã
    if (!maLichTrinh) {
      ride.maLichTrinh = null;
      await ride.save();
      return res.json({
        success: true,
        message: "Đã bỏ mã lịch trình",
        maChuyen,
      });
    }

    // ✅ Chỉ check khi có mã
    const schedule = await Schedule.findOne({
      "rows.maLichTrinh": maLichTrinh,
    }).lean();

    if (!schedule) {
      return res.status(404).json({
        error: "Mã lịch trình không tồn tại",
      });
    }

    ride.maLichTrinh = maLichTrinh;
    await ride.save();

    res.json({
      success: true,
      message: "Đã gán mã lịch trình cho chuyến",
      maChuyen,
      maLichTrinh,
    });
  } catch (err) {
    console.error("Lỗi gán mã lịch trình:", err);
    res.status(500).json({ error: err.message });
  }
};
