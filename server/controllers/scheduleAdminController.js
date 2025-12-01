const ScheduleAdmin = require("../models/ScheduleAdmin");
const mongoose = require("mongoose");

// 🆕 Tạo chuyến mới
const createScheduleAdmin = async (req, res) => {
  try {
    const { dieuVan, dieuVanID, ...data } = req.body;
    const user = req.user;

    if (!user || !["admin", "dieuVan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền tạo chuyến" });
    }

    // 🔹 Tạo mã chuyến tự động BKMM.XXXX
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, "0"); // 01 -> 12

    // 🔹 Lấy chuyến cao nhất trong tháng hiện tại
    const lastRide = await ScheduleAdmin.find({ maChuyen: new RegExp(`^BK${monthStr}`) })
      .sort({ maChuyen: -1 })
      .limit(1);

    let nextNum = 1;
    if (lastRide.length > 0) {
      const lastMa = lastRide[0].maChuyen; // ví dụ: BK11.0023
      nextNum = parseInt(lastMa.split(".")[1], 10) + 1;
    }

    const maChuyen = `BK${monthStr}.${String(nextNum).padStart(4, "0")}`;

    // Nếu điều vận tạo, vẫn có thể tạo chuyến cho điều vận khác
    const newSchedule = new ScheduleAdmin({
      dieuVan: dieuVan || user.username,
      dieuVanID: dieuVanID || user.id,
      createdBy: user.fullname || user.username,
      maChuyen, // 💡 gán mã tự động
      ...data,
    });

    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (err) {
    console.error("❌ Lỗi khi tạo chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};


// ✏️ Sửa chuyến
const updateScheduleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduleAdmin.findById(id);
    const user = req.user;

    if (!schedule) return res.status(404).json({ error: "Không tìm thấy chuyến" });

    // Admin hoặc điều vận đều có quyền sửa
    if (!["admin", "dieuVan", "keToan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền sửa chuyến này" });
    }

    Object.assign(schedule, req.body);
    await schedule.save();
    res.json(schedule);
  } catch (err) {
    console.error("Lỗi khi sửa chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};

// ❌ Xóa chuyến - chỉ admin mới được xóa
const deleteScheduleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduleAdmin.findById(id);
    const user = req.user;

    if (!schedule) return res.status(404).json({ error: "Không tìm thấy chuyến" });

    if (user.role !== "admin" || user.role !== "dieuVan") {
      return res.status(403).json({ error: "Chỉ admin mới có quyền xóa" });
    }

    await schedule.deleteOne();
    res.json({ message: "Đã xóa thành công" });
  } catch (err) {
    console.error("Lỗi khi xóa chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};

const getAllSchedulesAdmin = async (req, res) => {
  try {
    const query = req.query;
    const filter = {};
    const andConditions = [];

    // 📌 Phân trang
    const page = parseInt(query.page || 1);
    const limit = parseInt(query.limit || 30);
    const skip = (page - 1) * limit;

    // ===============================
    // ⭐ LỌC TỰ ĐỘNG GIỐNG HỆT API KẾ TOÁN
    // ===============================

    for (const [key, value] of Object.entries(query)) {
      if (!value) continue;

      // Bỏ field hệ thống
      if (["page", "limit"].includes(key)) continue;

      // 🔹 Lọc ngày: field chứa chữ “ngay”
      if (key.toLowerCase().includes("ngay")) {
        const start = new Date(value);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);

        andConditions.push({
          [key]: { $gte: start, $lte: end }
        });

        continue;
      }

      // 🔹 Boolean
      if (value === "true" || value === "false") {
        andConditions.push({ [key]: value === "true" });
        continue;
      }

      // 🔹 Number
      if (!isNaN(value)) {
        andConditions.push({ [key]: Number(value) });
        continue;
      }

      // 🔹 String → chứa
      andConditions.push({ [key]: new RegExp(value, "i") });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // ===============================
    // ⭐ TRẢ VỀ DỮ LIỆU
    // ===============================

    const total = await ScheduleAdmin.countDocuments(filter);

    const schedules = await ScheduleAdmin.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      data: schedules,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy tất cả chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};


// 🔍 Lấy lịch trình theo tên điều vận
const getSchedulesByDieuVan = async (req, res) => {
  try {
    const { dieuVanID } = req.params;

    if (!dieuVanID) {
      return res.status(400).json({ error: "Thiếu ID điều vận" });
    }

    // Base filter
    const filter = { dieuVanID };
    const andConditions = [];

    // Tự động lấy toàn bộ field từ FE để lọc
    for (const [key, value] of Object.entries(req.query)) {
      if (!value) continue;

      // ⚠️ Bỏ page, limit
      if (["page", "limit"].includes(key)) continue;

      // ⏳ Nếu là trường ngày → tạo range trong ngày
      if (key.toLowerCase().includes("ngay")) {
        const start = new Date(value);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        andConditions.push({ [key]: { $gte: start, $lte: end } });
      }
      // 🔍 Các trường chuỗi, regex
      else {
        andConditions.push({ [key]: new RegExp(value, "i") });
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // 📌 Phân trang
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 50);
    const skip = (page - 1) * limit;

    const total = await ScheduleAdmin.countDocuments(filter);

    const schedules = await ScheduleAdmin.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      data: schedules,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });

  } catch (err) {
    console.error("❌ Lỗi lấy chuyến theo điều vận:", err);
    res.status(500).json({ error: "Lỗi server khi lấy chuyến theo điều vận" });
  }
};



// 📌 Lấy danh sách chuyến theo kế toán phụ trách
const getSchedulesByAccountant = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Không xác thực được người dùng" });
    }

    if (user.role !== "keToan") {
      return res.status(403).json({ error: "Chỉ kế toán mới được xem danh sách này" });
    }

    const filter = { accountUsername: user.username };
    const andConditions = [];

    // Tự động lọc theo toàn bộ query
    for (const [key, value] of Object.entries(req.query)) {
      if (!value) continue;

      if (["page", "limit"].includes(key)) continue;

      // Ngày → xử lý range trong ngày
      if (key.toLowerCase().includes("ngay")) {
        const start = new Date(value);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        andConditions.push({ [key]: { $gte: start, $lte: end } });
      } 
      else {
        andConditions.push({ [key]: new RegExp(value, "i") });
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // 📌 Phân trang
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 30);
    const skip = (page - 1) * limit;

    const total = await ScheduleAdmin.countDocuments(filter);

    const schedules = await ScheduleAdmin.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      data: schedules,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy chuyến theo kế toán:", err);
    res.status(500).json({ error: err.message });
  }
};



// 🆕 Thêm mã hoá đơn cho 1 hoặc nhiều chuyến
const addHoaDonToSchedules = async (req, res) => {
  try {
    const { maHoaDon, maChuyenList } = req.body;

    if (!maHoaDon || !Array.isArray(maChuyenList) || maChuyenList.length === 0) {
      return res.status(400).json({ error: "Thiếu maHoaDon hoặc maChuyenList" });
    }

    // Cập nhật tất cả chuyến có mã chuyến trong maChuyenList
    const result = await ScheduleAdmin.updateMany(
      { maChuyen: { $in: maChuyenList } },
      { $set: { maHoaDon } }
    );

    res.json({
      message: `Đã cập nhật mã hoá đơn cho ${result.modifiedCount} chuyến`,
      maHoaDon,
      maChuyenList,
    });
  } catch (err) {
    console.error("❌ Lỗi khi thêm mã hoá đơn cho chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};



const addBoSung = async (req, res) => {
  try {
    const { updates } = req.body; // [{ maChuyen, cuocPhiBoSung }, ...]

    for (const u of updates) {
      const schedule = await ScheduleAdmin.findOne({ maChuyen: u.maChuyen });
      if (schedule) {
        schedule.ltState = u.ltState?.toString() || "";
        schedule.onlState = u.onlState?.toString() || "";
        schedule.offState = u.offState?.toString() || "";
        schedule.cuocPhiBS = u.cuocPhiBS?.toString() || "";
        schedule.daThanhToan = u.daThanhToan?.toString() || "";
        schedule.bocXepBS = u.bocXepBS?.toString() || "";
        schedule.veBS = u.veBS?.toString() || "";
        schedule.hangVeBS = u.hangVeBS?.toString() || "";
        schedule.luuCaBS = u.luuCaBS?.toString() || "";
        schedule.cpKhacBS = u.cpKhacBS?.toString() || "";
        await schedule.save();
      }
    }

    res.json({ message: "Cập nhật cước phí bổ sung thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


const importSchedulesFromExcel = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["admin", "dieuVan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền import chuyến" });
    }

    let { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu để import" });
    }

    let count = 0;

    for (const r of records) {
      const maChuyen = r.maChuyen?.toString().trim();

      if (!maChuyen) {
        console.log("🚫 Bỏ qua dòng vì không có mã chuyến");
        continue;
      }

      // Xoá bản ghi cũ
      await ScheduleAdmin.deleteOne({ maChuyen });

      try {
  await ScheduleAdmin.create({
    dieuVan: user.fullname || user.username,
    dieuVanID: user.id,
    createdBy: user.fullname || user.username,

    tenLaiXe: r.tenLaiXe || "",
    maKH: r.maKH || "",
    khachHang: r.khachHang || "",
    dienGiai: r.dienGiai || "",

    ngayBoc: r.ngayBoc ? new Date(r.ngayBoc) : null,
    ngayBocHang: r.ngayBocHang ? new Date(r.ngayBocHang) : null,
    ngayGiaoHang: r.ngayGiaoHang ? new Date(r.ngayGiaoHang) : null,

    diemXepHang: r.diemXepHang || "",
    diemDoHang: r.diemDoHang || "",
    soDiem: r.soDiem || "",
    trongLuong: r.trongLuong || "",
    bienSoXe: r.bienSoXe || "",
    cuocPhi: r.cuocPhi || "",
    daThanhToan: r.daThanhToan || "",
    bocXep: r.bocXep || "",
    ve: r.ve || "",
    hangVe: r.hangVe || "",
    luuCa: r.luuCa || "",
    luatChiPhiKhac: r.luatChiPhiKhac || "",
    ghiChu: r.ghiChu || "",
    maChuyen,
    accountUsername: r.accountUsername || "",
  });

  count++;

} catch (err) {
  console.log("❌ LỖI KHI LƯU CHUYẾN", maChuyen, "→", err.message);
}
    }

    return res.json({
      success: true,
      message: `Import thành công ${count} chuyến`,
    });

  } catch (err) {
    console.error("Lỗi import Excel:", err);
    return res.status(500).json({ error: err.message });
  }
};

// ⚠️ Toggle cảnh báo cho chuyến
const toggleWarning = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await ScheduleAdmin.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    // Đảo trạng thái cảnh báo
    schedule.warning = !schedule.warning;
    await schedule.save();

    res.json({
      success: true,
      message: schedule.warning ? "Đã bật cảnh báo" : "Đã tắt cảnh báo",
      warning: schedule.warning
    });

  } catch (err) {
    console.error("❌ Lỗi toggle cảnh báo:", err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
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
};
