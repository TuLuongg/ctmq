const ScheduleAdmin = require("../models/ScheduleAdmin");
const Customer = require("../models/Customer");
const CustomerDebtPeriod = require("../models/CustomerDebtPeriod");
const mongoose = require("mongoose");

// 🆕 Tạo chuyến mới
const createScheduleAdmin = async (req, res) => {
  try {
    const { dieuVan, dieuVanID, ...data } = req.body;
    const user = req.user;

    if (!user || !["admin", "dieuVan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền tạo chuyến" });
    }

    // 🔹 Ngày hiện tại
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, "0"); // 01 -> 12
    const yearStr = String(today.getFullYear()).slice(-2); // lấy 2 số cuối của năm, ví dụ 25

    // 🔹 Regex tìm mã chuyến cùng tháng và năm
    const regex = new RegExp(`^BK${monthStr}${yearStr}\\.\\d{4}$`);

    // 🔹 Lấy chuyến cao nhất trong tháng hiện tại
    const lastRide = await ScheduleAdmin.find({ maChuyen: regex })
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

    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    if (!["admin", "dieuVan", "keToan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền sửa chuyến này" });
    }

    const oldDate = schedule.ngayGiaoHang;
    const newDate = req.body.ngayGiaoHang || oldDate;

    // 🔒 CHECK NGÀY CŨ
    const lockedOld = await checkLockedDebtPeriod(schedule.maKH, oldDate);
    if (lockedOld) {
      return res.status(400).json({
        error: `Kỳ công nợ ${lockedOld.debtCode} đã khoá, không thể sửa chuyến`,
      });
    }

    // 🔒 CHECK NGÀY MỚI (nếu đổi ngày)
    const lockedNew = await checkLockedDebtPeriod(schedule.maKH, newDate);
    if (lockedNew) {
      return res.status(400).json({
        error: `Kỳ công nợ ${lockedNew.debtCode} đã khoá, không thể đổi ngày chuyến`,
      });
    }

    // ⬇️ UPDATE BÌNH THƯỜNG
    Object.assign(schedule, req.body);
    await schedule.save();

    res.json(schedule);
  } catch (err) {
    console.error("Lỗi khi sửa chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Xóa mềm (đưa vào thùng rác)
const deleteScheduleAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await ScheduleAdmin.findById(id);
    if (!schedule)
      return res.status(404).json({ error: "Không tìm thấy chuyến" });

    schedule.isDeleted = true;
    schedule.deletedAt = new Date();
    await schedule.save();

    res.json({ message: "Đã chuyển chuyến vào thùng rác" });
  } catch (err) {
    console.error("Soft delete error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Xóa mềm theo khoảng ngày
const deleteSchedulesByDateRange = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !["admin", "dieuVan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền" });
    }

    const { startDate, endDate } = req.body;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const result = await ScheduleAdmin.updateMany(
      { ngayGiaoHang: { $gte: start, $lte: end } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.json({
      message: `Đã chuyển ${result.modifiedCount} chuyến vào thùng rác`,
    });
  } catch (err) {
    console.error("Delete range error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📥 Lấy danh sách thùng rác
const getTrashSchedules = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 50);
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {
      isDeleted: true,
      $or: [
        { maChuyen: new RegExp(search, "i") },
        { tenLaiXe: new RegExp(search, "i") },
        { bienSoXe: new RegExp(search, "i") },
      ],
    };

    const total = await ScheduleAdmin.countDocuments(filter);

    // Lấy data trước
    let data = await ScheduleAdmin.find(filter)
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 👉 TÍNH SỐ NGÀY CÒN LẠI
    const now = new Date();
    const MAX_DAYS = 30;

    data = data.map((item) => {
      const deletedAt = item.deletedAt || now;
      const diffTime = now - deletedAt; // mili giây
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...item,
        daysLeft: Math.max(0, MAX_DAYS - diffDays), // không bị âm
      };
    });

    return res.json({
      data,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ♻️ Khôi phục chuyến
const restoreSchedule = async (req, res) => {
  try {
    const { maChuyenList } = req.body;

    if (!maChuyenList || maChuyenList.length === 0) {
      return res.status(400).json({ error: "Danh sách rỗng" });
    }

    const result = await ScheduleAdmin.updateMany(
      { maChuyen: { $in: maChuyenList }, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null } }
    );

    return res.json({
      message: `Đã khôi phục ${result.modifiedCount} chuyến`,
    });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ❌ Xóa vĩnh viễn
const forceDeleteSchedule = async (req, res) => {
  try {
    const { maChuyenList } = req.body;

    if (!maChuyenList || maChuyenList.length === 0) {
      return res.status(400).json({ error: "Danh sách rỗng" });
    }

    // Chỉ xoá vĩnh viễn những chuyến đang trong thùng rác
    const result = await ScheduleAdmin.deleteMany({
      maChuyen: { $in: maChuyenList },
      isDeleted: true,
    });

    return res.json({
      message: `Đã xóa vĩnh viễn ${result.deletedCount} chuyến khỏi database`,
    });
  } catch (err) {
    console.error("Force delete error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🔥 Dọn sạch thùng rác
const emptyTrash = async (req, res) => {
  try {
    const result = await ScheduleAdmin.deleteMany({ isDeleted: true });
    res.json({ message: `Đã xóa vĩnh viễn ${result.deletedCount} chuyến` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllSchedulesAdmin = async (req, res) => {
  try {
    const query = req.query;

    const filter = {
      isDeleted: { $ne: true },
    };

    const andConditions = [];

    // ===============================
    // 📌 PHÂN TRANG
    // ===============================
    const page = parseInt(query.page || 1);
    const limit = parseInt(query.limit || 50);
    const skip = (page - 1) * limit;

    // ===============================
    // 🔹 LỌC KHOẢNG NGÀY GIAO
    // ===============================
    const { giaoFrom, giaoTo } = query;

    if (giaoFrom || giaoTo) {
      const range = {};
      if (giaoFrom) range.$gte = new Date(giaoFrom);
      if (giaoTo) {
        const end = new Date(giaoTo);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      andConditions.push({ ngayGiaoHang: range });
    }

    // ===============================
    // 🔹 FILTER ARRAY (KH / LÁI XE / BIỂN SỐ)
    // ===============================
    const arrayFilterMap = {
      khachHang: "khachHang",
      tenLaiXe: "tenLaiXe",
      bienSoXe: "bienSoXe",
    };

    for (const [queryKey, field] of Object.entries(arrayFilterMap)) {
      let values = query[queryKey] || query[`${queryKey}[]`];
      if (!values) continue;
      if (!Array.isArray(values)) values = [values];
      values = values.filter(Boolean);
      if (!values.length) continue;

      andConditions.push({
        [field]: {
          $in: values.map((v) => new RegExp(`^${v}$`, "i")),
        },
      });
    }

    // ===============================
    // 🔹 FILTER TIỀN (ĐÃ NHẬP / CHƯA NHẬP)
    // ===============================
    const moneyFields = [
      "cuocPhi",
      "bocXep",
      "ve",
      "hangVe",
      "luuCa",
      "luatChiPhiKhac",
      "cuocPhiBS",
      "bocXepBS",
      "veBS",
      "hangVeBS",
      "luuCaBS",
      "cpKhacBS",
      "daThanhToan",
    ];

    moneyFields.forEach((field) => {
      const isEmpty = query[`${field}Empty`];
      const isFilled = query[`${field}Filled`];

      // CHƯA NHẬP
      if (isEmpty && !isFilled) {
        andConditions.push({
          $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: "" },
          ],
        });
      }

      // ĐÃ NHẬP
      if (isFilled && !isEmpty) {
        andConditions.push({
          [field]: { $nin: ["", null] },
        });
      }
    });

    // ===============================
    // 🔹 AUTO TEXT FILTER (KHÔNG PHÁ ARRAY + MONEY)
    // ===============================
    const ignoreKeys = [
      "page",
      "limit",
      "giaoFrom",
      "giaoTo",
      "ngayGiaoHang",
      ...Object.keys(arrayFilterMap),
      ...Object.keys(arrayFilterMap).map((k) => `${k}[]`),
    ];

    moneyFields.forEach((f) => {
      ignoreKeys.push(`${f}Empty`);
      ignoreKeys.push(`${f}Filled`);
    });

    for (const [key, value] of Object.entries(query)) {
      if (!value) continue;
      if (ignoreKeys.includes(key)) continue;

      // Ngày
      if (key.toLowerCase().includes("ngay")) {
        const start = new Date(value);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        andConditions.push({ [key]: { $gte: start, $lte: end } });
        continue;
      }

      // Boolean
      if (value === "true" || value === "false") {
        andConditions.push({ [key]: value === "true" });
        continue;
      }

      // Number
      if (!isNaN(value)) {
        andConditions.push({ [key]: Number(value) });
        continue;
      }

      // String
      andConditions.push({ [key]: new RegExp(value, "i") });
    }

    if (andConditions.length) {
      filter.$and = andConditions;
    }

    // ===============================
    // 🔹 QUERY DB
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
    return res.status(500).json({ error: err.message });
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
    const filter = { dieuVanID, isDeleted: { $ne: true } };
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
    const query = req.query;

    if (!user) {
      return res.status(401).json({ error: "Không xác thực được người dùng" });
    }

    if (user.role !== "keToan") {
      return res
        .status(403)
        .json({ error: "Chỉ kế toán mới được xem danh sách này" });
    }

    // =================================================
    // 🔹 FILTER GỐC
    // =================================================
    const filter = {
      accountUsername: user.username,
      isDeleted: { $ne: true },
    };

    const andConditions = [];

    // =================================================
    // 🔹 LỌC NGÀY GIAO
    // =================================================
    const { giaoFrom, giaoTo } = query;

    if (giaoFrom || giaoTo) {
      const range = {};
      if (giaoFrom) range.$gte = new Date(giaoFrom);
      if (giaoTo) {
        const end = new Date(giaoTo);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      andConditions.push({ ngayGiaoHang: range });
    }

    // =================================================
    // 🔹 FILTER ARRAY (KH / LÁI XE / BIỂN SỐ)
    // =================================================
    const arrayFilterMap = {
      khachHang: "khachHang",
      tenLaiXe: "tenLaiXe",
      bienSoXe: "bienSoXe",
    };

    for (const [queryKey, field] of Object.entries(arrayFilterMap)) {
      let values = query[queryKey] || query[`${queryKey}[]`];
      if (!values) continue;
      if (!Array.isArray(values)) values = [values];
      values = values.filter(Boolean);
      if (!values.length) continue;

      andConditions.push({
        [field]: {
          $in: values.map((v) => new RegExp(`^${v}$`, "i")),
        },
      });
    }

    // =================================================
    // 🔹 FILTER TIỀN (ĐÃ NHẬP / CHƯA NHẬP)
    // =================================================
    const moneyFields = [
      "cuocPhi",
      "bocXep",
      "ve",
      "hangVe",
      "luuCa",
      "luatChiPhiKhac",
      "cuocPhiBS",
      "bocXepBS",
      "veBS",
      "hangVeBS",
      "luuCaBS",
      "cpKhacBS",
      "daThanhToan",
    ];

    moneyFields.forEach((field) => {
      const isEmpty = query[`${field}Empty`];
      const isFilled = query[`${field}Filled`];

      // CHƯA NHẬP
      if (isEmpty && !isFilled) {
        andConditions.push({
          $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: "" },
          ],
        });
      }

      // ĐÃ NHẬP
      if (isFilled && !isEmpty) {
        andConditions.push({
          [field]: { $nin: ["", null] },
        });
      }
    });

    // =================================================
    // 🔹 AUTO TEXT FILTER (CHỈ FIELD THẬT TRONG DB)
    // =================================================
    const ignoreKeys = [
      "page",
      "limit",
      "giaoFrom",
      "giaoTo",
      "ngayGiaoHang",
      ...Object.keys(arrayFilterMap),
      ...Object.keys(arrayFilterMap).map((k) => `${k}[]`),
    ];

    moneyFields.forEach((f) => {
      ignoreKeys.push(`${f}Empty`);
      ignoreKeys.push(`${f}Filled`);
    });

    for (const [key, value] of Object.entries(query)) {
      if (!value) continue;
      if (ignoreKeys.includes(key)) continue;

      andConditions.push({
        [key]: new RegExp(value, "i"),
      });
    }

    if (andConditions.length) {
      filter.$and = andConditions;
    }

    // =================================================
    // 🔹 PHÂN TRANG
    // =================================================
    const page = parseInt(query.page || 1);
    const limit = parseInt(query.limit || 50);
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
    return res.status(500).json({ error: err.message });
  }
};

//Lấy danh sách KH, bsx, tên lái xe
const getScheduleFilterOptions = async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== "keToan") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const baseFilter = {
      accountUsername: user.username,
      isDeleted: { $ne: true },
    };

    const [khachHang, tenLaiXe, bienSoXe] = await Promise.all([
      ScheduleAdmin.distinct("khachHang", baseFilter),
      ScheduleAdmin.distinct("tenLaiXe", baseFilter),
      ScheduleAdmin.distinct("bienSoXe", baseFilter),
    ]);

    res.json({
      khachHang: khachHang.filter(Boolean).sort(),
      tenLaiXe: tenLaiXe.filter(Boolean).sort(),
      bienSoXe: bienSoXe.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("❌ Filter options error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🆕 Thêm mã hoá đơn cho 1 hoặc nhiều chuyến
const addHoaDonToSchedules = async (req, res) => {
  try {
    const { maHoaDon, maChuyenList } = req.body;

    if (
      !maHoaDon ||
      !Array.isArray(maChuyenList) ||
      maChuyenList.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Thiếu maHoaDon hoặc maChuyenList" });
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

    const { records, mode = "overwrite" } = req.body;
    // mode: "overwrite" | "add"

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu để import" });
    }

    let count = 0;
    let skipped = 0;

    for (const r of records) {
      const maChuyen = r.maChuyen?.toString().trim();
      const maKH = r.maKH?.toString().trim();

      if (!maChuyen) {
        console.log("🚫 Bỏ qua dòng vì không có mã chuyến");
        skipped++;
        continue;
      }

      // check khoá kỳ công nợ
      const locked = await checkLockedDebtPeriod(maKH, r.ngayGiaoHang);
      if (locked) {
        console.log(
          `⛔ Bỏ qua chuyến ${maChuyen} vì kỳ ${locked.debtCode} đã khoá`
        );
        skipped++;
        continue;
      }

      const existed = await ScheduleAdmin.findOne({ maChuyen });

      // ===== MODE: ADD (chỉ thêm mới) =====
      if (mode === "add" && existed) {
        console.log(`⚠️ Bỏ qua ${maChuyen} vì đã tồn tại (mode add)`);
        skipped++;
        continue;
      }

      // Nếu có maKH thì lấy thông tin khách hàng
      let khachHang = r.khachHang || "";
      let accountUsername = r.accountUsername || "";

      if (maKH) {
        const customer = await Customer.findOne({ code: maKH });
        if (customer) {
          khachHang = customer.name || khachHang;
          accountUsername = customer.accUsername || accountUsername;
        }
      }

      const data = {
        dieuVan: user.fullname || user.username,
        dieuVanID: user.id,
        createdBy: user.fullname || user.username,

        ltState: r.ltState || "",
        onlState: r.onlState || "",
        offState: r.offState || "",

        tenLaiXe: r.tenLaiXe || "",
        maKH: maKH || "",
        khachHang,
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
        accountUsername,
      };

      try {
        if (existed) {
          // ===== MODE: OVERWRITE =====
          await ScheduleAdmin.updateOne({ maChuyen }, { $set: data });
          console.log(`🔁 Ghi đè chuyến ${maChuyen}`);
        } else {
          await ScheduleAdmin.create(data);
          console.log(`➕ Thêm mới chuyến ${maChuyen}`);
        }

        count++;
      } catch (err) {
        console.log("❌ LỖI KHI LƯU CHUYẾN", maChuyen, "→", err.message);
      }
    }

    return res.json({
      success: true,
      message: `Import thành công ${count} chuyến, bỏ qua ${skipped} chuyến`,
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
      warning: schedule.warning,
    });
  } catch (err) {
    console.error("❌ Lỗi toggle cảnh báo:", err);
    res.status(500).json({ error: err.message });
  }
};

const checkLockedDebtPeriod = async (maKH, ngayGiaoHang) => {
  if (!maKH || !ngayGiaoHang) return null;

  return await CustomerDebtPeriod.findOne({
    customerCode: maKH,
    isLocked: true,
    fromDate: { $lte: new Date(ngayGiaoHang) },
    toDate: { $gte: new Date(ngayGiaoHang) },
  });
};

module.exports = {
  createScheduleAdmin,
  updateScheduleAdmin,
  deleteScheduleAdmin,
  deleteSchedulesByDateRange,
  getAllSchedulesAdmin,
  getSchedulesByDieuVan,
  getSchedulesByAccountant,
  addHoaDonToSchedules,
  addBoSung,
  importSchedulesFromExcel,
  toggleWarning,
  getTrashSchedules,
  restoreSchedule,
  forceDeleteSchedule,
  emptyTrash,
  getScheduleFilterOptions,
};
