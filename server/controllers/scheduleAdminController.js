const ScheduleAdmin = require("../models/ScheduleAdmin");
const RideHistory = require("../models/RideHistory");
const Customer = require("../models/Customer");
const CustomerDebtPeriod = require("../models/CustomerDebtPeriod");
const ExcelJS = require("exceljs");
const path = require("path");
const mongoose = require("mongoose");

const calcHoaHong = async (schedule) => {
  if (!schedule?.maKH) return;

  const customer = await Customer.findOne({ code: schedule.maKH }).lean();
  const percentHH = Number(customer?.percentHH || 0);

  const toNum = (v) => Number(String(v || 0).replace(/[.,]/g, "")) || 0;

  const cuocPhiBS = toNum(schedule.cuocPhiBS);
  const themDiem = toNum(schedule.themDiem);
  const hangVeBS = toNum(schedule.hangVeBS);

  const baseHH = cuocPhiBS + themDiem + hangVeBS;

  schedule.percentHH = percentHH;
  schedule.moneyHH = Math.round((baseHH * percentHH) / 100);
  schedule.moneyConLai = cuocPhiBS - schedule.moneyHH;
};

// 🆕 Tạo chuyến mới
const createScheduleAdmin = async (req, res) => {
  try {
    const { dieuVan, dieuVanID, ngayGiaoHang, ...data } = req.body;
    const user = req.user;

    if (!user || !["admin", "dieuVan", "keToan"].includes(user.role)) {
      return res.status(403).json({ error: "Không có quyền tạo chuyến" });
    }

    if (!ngayGiaoHang) {
      return res.status(400).json({ error: "Thiếu ngày giao hàng" });
    }

    const giaoDate = new Date(ngayGiaoHang);
    if (isNaN(giaoDate.getTime())) {
      return res.status(400).json({ error: "ngayGiaoHang không hợp lệ" });
    }

    const monthStr = String(giaoDate.getMonth() + 1).padStart(2, "0");
    const yearStr = String(giaoDate.getFullYear()).slice(-2);

    // ✅ REGEX ĐÚNG
    const regex = new RegExp(`^BK\\.${monthStr}\\.${yearStr}\\.\\d{4}$`);

    const lastRide = await ScheduleAdmin.findOne({ maChuyen: regex })
      .sort({ maChuyen: -1 })
      .lean();

    let nextNum = 1;
    if (lastRide?.maChuyen) {
      const parts = lastRide.maChuyen.split(".");
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }

    const maChuyen = `BK.${monthStr}.${yearStr}.${String(nextNum).padStart(
      4,
      "0"
    )}`;

    const newSchedule = new ScheduleAdmin({
      dieuVan: dieuVan || user.username,
      dieuVanID: dieuVanID || user._id,
      createdBy: user.fullname || user.username,
      maChuyen,
      ngayGiaoHang,
      ...data,
    });

    // 🔥 AUTO TÍNH HOA HỒNG
    await calcHoaHong(newSchedule);

    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Mã chuyến bị trùng, vui lòng thử lại",
      });
    }

    console.error("❌ Lỗi khi tạo chuyến:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Sửa chuyến với lưu lịch sử có điều kiện nâng cao
const updateScheduleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduleAdmin.findById(id);
    const user = req.user;

    if (!schedule)
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    if (!["admin", "dieuVan", "keToan"].includes(user.role))
      return res.status(403).json({ error: "Không có quyền sửa chuyến này" });

    const oldDate = schedule.ngayGiaoHang;
    const newDate = req.body.ngayGiaoHang || oldDate;

    // 🔒 Kiểm tra khóa công nợ
    const lockedOld = await checkLockedDebtPeriod(schedule.maKH, oldDate);
    if (lockedOld)
      return res.status(400).json({
        error: `Kỳ công nợ ${lockedOld.debtCode} đã khoá, không thể sửa chuyến`,
      });

    const lockedNew = await checkLockedDebtPeriod(schedule.maKH, newDate);
    if (lockedNew)
      return res.status(400).json({
        error: `Kỳ công nợ ${lockedNew.debtCode} đã khoá, không thể đổi ngày chuyến`,
      });

    const previousData = schedule.toObject();
    const newData = { ...previousData, ...req.body };

    const importantFields = [
      "cuocPhi",
      "bocXep",
      "ve",
      "hangVe",
      "luuCa",
      "luatChiPhiKhac",
    ];
    const ignoredFields = ["ltState", "onlState", "offState"];
    const ignoreCompareFields = ["createdAt", "updatedAt"];

    // Lấy các trường thực sự thay đổi
    const changedFields = Object.keys(req.body).filter((field) => {
      if (ignoreCompareFields.includes(field)) return false;

      const oldVal = previousData[field];
      const newVal = req.body[field];

      // Nếu là Date object, chuyển sang ISO string
      const oldStr =
        oldVal instanceof Date ? oldVal.toISOString() : String(oldVal);
      const newStr =
        newVal instanceof Date
          ? new Date(newVal).toISOString()
          : String(newVal);

      return oldStr !== newStr;
    });

    // 🔹 Debug: in ra các trường thay đổi
    console.log("=== DEBUG: Trường thay đổi ===");
    changedFields.forEach((field) => {
      console.log(`${field}:`, previousData[field], "→", req.body[field]);
    });
    console.log("==============================");

    // 1️⃣ Nếu chỉ sửa các trường lt/onl/off → không lưu lịch sử
    const onlyIgnoredFieldsChanged =
      changedFields.length > 0 &&
      changedFields.every((field) => ignoredFields.includes(field));

    // 2️⃣ Nếu chỉ sửa các trường tiền mà cũ = 0/null/"" → không lưu lịch sử
    const onlyZeroImportantChanged =
      changedFields.length > 0 &&
      changedFields.every(
        (field) =>
          importantFields.includes(field) &&
          [0, null, ""].includes(Number(previousData[field]) || 0)
      );

    // 3️⃣ Chỉ tạo lịch sử nếu không thuộc 2 trường hợp trên
    const shouldSaveHistory = !(
      onlyIgnoredFieldsChanged || onlyZeroImportantChanged
    );

    if (shouldSaveHistory) {
      await RideHistory.create({
        rideID: schedule._id,
        editedByID: user._id || user.username || "unknown",
        editedBy: user.name || user.username || "unknown",
        reason: req.body.reason || "",
        previousData,
        newData,
      });
    }

    // Cập nhật dữ liệu bình thường
    Object.assign(schedule, req.body);

    // 🔥 AUTO RECALC HOA HỒNG
    await calcHoaHong(schedule);

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
    const MAX_DAYS = 60;

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
    // Base filter: chỉ loại bản ghi đã xóa
    const filter = { isDeleted: { $ne: true } };
    const andConditions = [];

    // 🔍 Lọc động theo query từ FE
    for (const [key, value] of Object.entries(req.query)) {
      if (!value) continue;

      // ⚠️ Bỏ page, limit
      if (["page", "limit"].includes(key)) continue;

      // ⏳ Nếu là trường ngày → lọc trong ngày
      if (key.toLowerCase().includes("ngay")) {
        const start = new Date(value);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);

        andConditions.push({
          [key]: { $gte: start, $lte: end },
        });
      }
      // 🔎 Các trường còn lại → regex
      else {
        andConditions.push({
          [key]: new RegExp(value, "i"),
        });
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // 📌 Phân trang
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 150);
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
    console.error("❌ Lỗi lấy danh sách chuyến:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách chuyến" });
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
      dienGiai: "dienGiai",
      cuocPhi: "cuocPhi",
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

// Lấy tất cả danh sách KH, bsx, tên lái xe, ... không cần điều kiện
const getAllScheduleFilterOptions = async (req, res) => {
  try {
    // Không cần kiểm tra quyền hay username
    const baseFilter = { isDeleted: { $ne: true } }; // chỉ loại bỏ các bản ghi đã xóa

    const [khachHang, tenLaiXe, bienSoXe, dienGiai, cuocPhi] =
      await Promise.all([
        ScheduleAdmin.distinct("khachHang", baseFilter),
        ScheduleAdmin.distinct("tenLaiXe", baseFilter),
        ScheduleAdmin.distinct("bienSoXe", baseFilter),
        ScheduleAdmin.distinct("dienGiai", baseFilter),
        ScheduleAdmin.distinct("cuocPhi", baseFilter),
      ]);

    res.json({
      khachHang: khachHang.filter(Boolean).sort(),
      tenLaiXe: tenLaiXe.filter(Boolean).sort(),
      bienSoXe: bienSoXe.filter(Boolean).sort(),
      dienGiai: dienGiai.filter(Boolean).sort(),
      cuocPhi: cuocPhi.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("❌ Filter options error:", err);
    res.status(500).json({ error: err.message });
  }
};

//Lấy danh sách KH, bsx, tên lái xe theo kế toán
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

    const [khachHang, tenLaiXe, bienSoXe, dienGiai, cuocPhi] =
      await Promise.all([
        ScheduleAdmin.distinct("khachHang", baseFilter),
        ScheduleAdmin.distinct("tenLaiXe", baseFilter),
        ScheduleAdmin.distinct("bienSoXe", baseFilter),
        ScheduleAdmin.distinct("dienGiai", baseFilter),
        ScheduleAdmin.distinct("cuocPhi", baseFilter),
      ]);

    res.json({
      khachHang: khachHang.filter(Boolean).sort(),
      tenLaiXe: tenLaiXe.filter(Boolean).sort(),
      bienSoXe: bienSoXe.filter(Boolean).sort(),
      dienGiai: dienGiai.filter(Boolean).sort(),
      cuocPhi: cuocPhi.filter(Boolean).sort(),
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
        schedule.bocXepBS = u.bocXepBS?.toString() || "";
        schedule.veBS = u.veBS?.toString() || "";
        schedule.hangVeBS = u.hangVeBS?.toString() || "";
        schedule.luuCaBS = u.luuCaBS?.toString() || "";
        schedule.cpKhacBS = u.cpKhacBS?.toString() || "";
        schedule.themDiem = u.themDiem?.toString() || "";
        await calcHoaHong(schedule);
        await schedule.save();
      }
    }

    res.json({ message: "Cập nhật cước phí bổ sung thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 🆕 Cập nhật bổ sung cho 1 chuyến
const addBoSungSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ltState,
      onlState,
      offState,
      cuocPhiBS,
      bocXepBS,
      veBS,
      hangVeBS,
      luuCaBS,
      cpKhacBS,
      themDiem,
    } = req.body;

    const schedule = await ScheduleAdmin.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy chuyến" });
    }

    schedule.ltState = ltState?.toString() || "";
    schedule.onlState = onlState?.toString() || "";
    schedule.offState = offState?.toString() || "";

    schedule.cuocPhiBS = cuocPhiBS?.toString() || "";
    schedule.bocXepBS = bocXepBS?.toString() || "";
    schedule.veBS = veBS?.toString() || "";
    schedule.hangVeBS = hangVeBS?.toString() || "";
    schedule.luuCaBS = luuCaBS?.toString() || "";
    schedule.cpKhacBS = cpKhacBS?.toString() || "";

    schedule.themDiem = themDiem?.toString() || "";
    await calcHoaHong(schedule);
    await schedule.save();

    res.json({
      success: true,
      message: "Cập nhật bổ sung chuyến thành công",
      data: schedule,
    });
  } catch (err) {
    console.error("❌ addBoSungSingle error:", err);
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

          // 🔥 RECALC SAU UPDATE
          const sch = await ScheduleAdmin.findOne({ maChuyen });
          await calcHoaHong(sch);
          await sch.save();
          console.log(`🔁 Ghi đè chuyến ${maChuyen}`);
        } else {
          await ScheduleAdmin.create(data);
          await calcHoaHong(sch);
          await sch.save();
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

const cleanNumber = (v) => Number(String(v || 0).replace(/[.,]/g, "")) || 0;

const parseVNDate = (dateStr, isEnd = false) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (isEnd) {
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const exportTripsByDateRange = async (req, res) => {
  try {
    const { from, to, maKHs } = req.body;
    console.log("EXPORT BODY >>>", req.body);

    if (!from || !to) {
      return res.status(400).json({ message: "Thiếu from hoặc to" });
    }

    const fromDate = parseVNDate(from);
    const toDate = parseVNDate(to, true);

    toDate.setHours(23, 59, 59, 999);

    // ======================
    // QUERY CONDITION
    // ======================
    const condition = {
      ngayGiaoHang: { $gte: fromDate, $lte: toDate },
    };

    if (Array.isArray(maKHs) && maKHs.length > 0) {
      condition.khachHang = { $in: maKHs };
    }

    const trips = await ScheduleAdmin.find(condition)
      .sort({ ngayGiaoHang: 1 })
      .lean();

    if (!trips.length) {
      return res.status(400).json({ message: "Không có dữ liệu" });
    }

    // ======================
    // LOAD FORM MẪU
    // ======================
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/DANH_SACH_CHUYEN.xlsx")
    );

    const sheet = workbook.getWorksheet("Thang 11"); // ⚠️ đúng tên sheet mẫu

    // ======================
    // SCHEMA
    // ======================
    const startRow = 2; // ⚠️ chỉnh theo form

    // ======================
    // GHI DỮ LIỆU
    // ======================
    trips.forEach((trip, index) => {
      const rowIndex = startRow + index;
      const row = sheet.getRow(rowIndex);

      row.getCell("A").value = trip.ltState || "";
      row.getCell("B").value = trip.onlState || "";
      row.getCell("C").value = trip.offState || "";
      row.getCell("D").value = trip.tenLaiXe || "";
      row.getCell("E").value = trip.maKH || "";
      row.getCell("F").value = trip.khachHang || "";
      row.getCell("G").value = trip.dienGiai || "";

      // DATE
      row.getCell("H").value = new Date(
        trip.ngayBocHang.toISOString().slice(0, 10)
      );
      row.getCell("I").value = new Date(
        trip.ngayGiaoHang.toISOString().slice(0, 10)
      );

      row.getCell("J").value = trip.diemDoHang || "";
      row.getCell("K").value = trip.diemXepHang || "";
      row.getCell("L").value = trip.soDiem || "";
      row.getCell("M").value = trip.trongLuong || "";
      row.getCell("N").value = trip.bienSoXe || "";

      const cuocPhi = cleanNumber(trip.cuocPhi);
      const bocXep = cleanNumber(trip.bocXep);
      const ve = cleanNumber(trip.ve);
      const hangVe = cleanNumber(trip.hangVe);
      const luuCa = cleanNumber(trip.luuCa);
      const cpKhac = cleanNumber(trip.luatChiPhiKhac);

      row.getCell("O").value = cuocPhi;
      row.getCell("Q").value = bocXep;
      row.getCell("R").value = ve;
      row.getCell("S").value = hangVe;
      row.getCell("T").value = luuCa;
      row.getCell("U").value = cpKhac;
      row.getCell("V").value = trip.ghiChu || "";
      row.getCell("W").value = trip.maChuyen || "";
      row.getCell("X").value = trip.accountUsername || "";

      row.commit();
    });

    // ======================
    // RESPONSE
    // ======================
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=DANH_SACH_CHUYEN_${from}_den_${to}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
};

const exportTripsByDateRangeBS = async (req, res) => {
  try {
    const { from, to, maKHs } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: "Thiếu from hoặc to" });
    }

    const fromDate = parseVNDate(from);
    const toDate = parseVNDate(to, true);

    toDate.setHours(23, 59, 59, 999);

    // ======================
    // QUERY CONDITION
    // ======================
    const condition = {
      ngayGiaoHang: { $gte: fromDate, $lte: toDate },
    };

    if (Array.isArray(maKHs) && maKHs.length > 0) {
      condition.khachHang = { $in: maKHs };
    }

    const trips = await ScheduleAdmin.find(condition)
      .sort({ ngayGiaoHang: 1 })
      .lean();

    if (!trips.length) {
      return res.status(400).json({ message: "Không có dữ liệu" });
    }

    // ======================
    // LOAD FORM MẪU
    // ======================
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../templates/DSC_BS.xlsm")
    );

    const sheet = workbook.getWorksheet("Thang 10"); // ⚠️ đúng tên sheet mẫu

    // ======================
    // SCHEMA
    // ======================
    const startRow = 2; // ⚠️ chỉnh theo form

    // ======================
    // GHI DỮ LIỆU
    // ======================
    trips.forEach((trip, index) => {
      const rowIndex = startRow + index;
      const row = sheet.getRow(rowIndex);

      row.getCell("A").value = trip.ltState || "";
      row.getCell("B").value = trip.onlState || "";
      row.getCell("C").value = trip.offState || "";
      row.getCell("D").value = trip.tenLaiXe || "";
      row.getCell("E").value = trip.maKH || "";
      row.getCell("F").value = trip.khachHang || "";
      row.getCell("G").value = trip.dienGiai || "";

      // DATE
      row.getCell("H").value = new Date(
        trip.ngayBocHang.toISOString().slice(0, 10)
      );
      row.getCell("I").value = new Date(
        trip.ngayGiaoHang.toISOString().slice(0, 10)
      );

      row.getCell("J").value = trip.diemDoHang || "";
      row.getCell("K").value = trip.diemXepHang || "";
      row.getCell("L").value = trip.soDiem || "";
      row.getCell("M").value = trip.trongLuong || "";
      row.getCell("N").value = trip.bienSoXe || "";

      const cuocPhi = cleanNumber(trip.cuocPhiBS);
      const daThanhToan = cleanNumber(trip.daThanhToan);
      const bocXep = cleanNumber(trip.bocXepBS);
      const ve = cleanNumber(trip.veBS);
      const hangVe = cleanNumber(trip.hangVeBS);
      const luuCa = cleanNumber(trip.luuCaBS);
      const cpKhac = cleanNumber(trip.cpKhacBS);

      row.getCell("O").value = cuocPhi;
      row.getCell("P").value = daThanhToan;
      row.getCell("Q").value = bocXep;
      row.getCell("R").value = ve;
      row.getCell("S").value = hangVe;
      row.getCell("T").value = luuCa;
      row.getCell("U").value = cpKhac;
      row.getCell("V").value = trip.ghiChu || "";
      row.getCell("W").value = trip.maChuyen || "";
      row.getCell("X").value = trip.accountUsername || "";
      row.getCell("Y").value = trip.percentHH || "0";
      row.getCell("Z").value = trip.moneyHH || "0";
      row.getCell("AA").value = trip.moneyConLai || "0";

      row.commit();
    });

    // ======================
    // RESPONSE
    // ======================
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=DANH_SACH_CHUYEN_${from}_den_${to}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi xuất Excel" });
  }
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
  getAllScheduleFilterOptions,
  exportTripsByDateRange,
  exportTripsByDateRangeBS,
  addBoSungSingle,
};
