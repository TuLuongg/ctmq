const Schedule = require("../models/Schedule");
const ScheduleCounter = require("../models/ScheduleCounter");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Chuyển tất cả fields về String
const mapFieldsToRow = (rowObj) => {
  const fields = rowObj.values;
  return {
    bienSoXe: String(fields[0] || ""),
    tenKhachHang: String(fields[1] || ""),
    giayTo: String(fields[2] || ""),
    noiDi: String(fields[3] || ""),
    noiDen: String(fields[4] || ""),
    trongLuongHang: String(fields[5] || ""),
    soDiem: String(fields[6] || ""),
    haiChieuVaLuuCa: String(fields[7] || ""),
    an: String(fields[8] || ""),
    tangCa: String(fields[9] || ""),
    bocXep: String(fields[10] || ""),
    ve: String(fields[11] || ""),
    tienChuyen: String(fields[12] || ""),
    chiPhiKhac: String(fields[13] || ""),
    laiXeThuKhach: String(rowObj.laiXeThuKhach || ""),
    phuongAn: String(rowObj.phuongAn || ""),
  };
};

const generateMaLichTrinhForRows = async (ngayVe, rowCount) => {
  const month = String(ngayVe.getMonth() + 1).padStart(2, "0");
  const year = String(ngayVe.getFullYear()).slice(-2);
  const counterKey = `LT${month}.${year}`; // VD: LT01.26

  const counter = await ScheduleCounter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: rowCount } },
    { new: true, upsert: true },
  );

  const startSeq = counter.seq - rowCount + 1;

  return Array.from({ length: rowCount }).map((_, i) => {
    return `${counterKey}.${String(startSeq + i).padStart(4, "0")}`;
  });
};

// Tạo lịch trình mới
const createSchedule = async (req, res) => {
  try {
    const { tenLaiXe, ngayDi, ngayVe, tongTienLichTrinh, rows } = req.body;

    const parseLocalDateTime = (str) => {
      const [datePart, timePart] = str.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hour, minute);
    };

    const parsedNgayVe = parseLocalDateTime(ngayVe);

    const processedRows = rows.map(mapFieldsToRow);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Danh sách row không hợp lệ" });
    }

    // 🔥 TẠO MÃ LỊCH TRÌNH CHO TỪNG ROW
    const maLichTrinhArr = await generateMaLichTrinhForRows(
      parsedNgayVe,
      processedRows.length,
    );

    processedRows.forEach((row, i) => {
      row.maLichTrinh = maLichTrinhArr[i];
    });

    const schedule = new Schedule({
      tenLaiXe: String(tenLaiXe || ""),
      ngayDi: parseLocalDateTime(ngayDi),
      ngayVe: parsedNgayVe,
      tongTienLichTrinh: String(tongTienLichTrinh || ""),
      rows: processedRows,
    });

    await schedule.save();
    res.status(201).json(schedule);
  } catch (err) {
    console.error("Lỗi tạo lịch trình:", err);
    res.status(500).json({ error: err.message });
  }
};

const buildUTCDateRange = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  const [y, m, d] = dateStr.split("-").map(Number);

  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  return { start, end };
};

// Lấy lịch trình theo ngày
const getSchedulesByDate = async (req, res) => {
  try {
    let query = {};

    if (req.query.ngay) {
      const ngayInput = req.query.ngay;

      const { start, end } = buildUTCDateRange(ngayInput);

      console.log("🔎 Filter ngayDi từ:", start.toISOString());
      console.log("🔎 Filter ngayDi đến:", end.toISOString());

      query.ngayDi = { $gte: start, $lte: end };
    }

    const schedules = await Schedule.find(query);

    console.log("📦 Số lịch trình tìm được:", schedules.length);

    res.json(schedules);
  } catch (err) {
    console.error("❌ getSchedulesByDate error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Lấy lịch trình theo khoảng ngày
const getSchedulesByRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ error: "Thiếu from hoặc to" });

    const start = buildUTCDateRange(from).start;
    const end = buildUTCDateRange(to).end;

    console.log("🔎 Range từ:", start.toISOString());
    console.log("🔎 Range đến:", end.toISOString());

    const schedules = await Schedule.find({
      ngayDi: { $gte: start, $lte: end },
    });

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Parse theo giờ VN (UTC+7) an toàn, không double offset
const buildCreatedAtVN = (input, isEnd = false) => {
  if (!input) throw new Error("Thiếu input");

  // Nếu có giờ (datetime-local)
  if (input.includes("T")) {
    // Thêm :00 nếu thiếu giây
    const normalized = input.length === 16 ? input + ":00" : input;

    // Thêm +07:00 để ép timezone VN
    const withTimezone = normalized + "+07:00";

    const date = new Date(withTimezone);

    if (isNaN(date)) throw new Error("Datetime không hợp lệ");

    return date;
  }

  // Nếu chỉ có YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error("Format phải là YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm");
  }

  const [y, m, d] = input.split("-").map(Number);

  if (isEnd) {
    return new Date(Date.UTC(y, m - 1, d, 16, 59, 59, 999)); // 23:59:59 VN
  }

  return new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0)); // 00:00 VN
};

// Lấy lịch trình theo ngày tạo (createdAt)
const getSchedulesByCreatedDate = async (req, res) => {
  try {
    const { ngay } = req.query;
    if (!ngay) {
      return res.status(400).json({ error: "Thiếu tham số ngay" });
    }

    const start = buildCreatedAtVN(ngay);
    const end = buildCreatedAtVN(ngay, true);
    console.log("🔎 UTC từ:", start.toISOString());
    console.log("🔎 UTC đến:", end.toISOString());

    const schedules = await Schedule.find({
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Lấy lịch trình theo khoảng ngày tạo (createdAt)
const getSchedulesByCreatedRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Thiếu from hoặc to" });
    }

    const start = buildCreatedAtVN(from);
    const end = buildCreatedAtVN(to, true);

    console.log("🔎 UTC từ:", start.toISOString());
    console.log("🔎 UTC đến:", end.toISOString());

    const schedules = await Schedule.find({
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Xóa lịch trình theo ngày
const deleteSchedulesByDate = async (req, res) => {
  try {
    if (!req.query.ngay)
      return res.status(400).json({ error: "Thiếu tham số ngày" });

    const { start, end } = buildUTCDateRange(req.query.ngay);

    const result = await Schedule.deleteMany({
      ngayDi: { $gte: start, $lte: end },
    });

    res.json({
      message: `Đã xóa ${result.deletedCount} lịch trình cho ngày ${req.query.ngay}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Xóa lịch trình thất bại" });
  }
};

// Xóa lịch trình theo khoảng ngày
const deleteSchedulesByRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ error: "Thiếu from hoặc to" });

    const start = buildUTCDateRange(from).start;
    const end = buildUTCDateRange(to).end;

    const result = await Schedule.deleteMany({
      ngayDi: { $gte: start, $lte: end },
    });

    res.json({
      message: `Đã xóa ${result.deletedCount} lịch trình từ ${from} đến ${to}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Xóa lịch trình theo khoảng ngày thất bại" });
  }
};

// Hàm định dạng UTC ngày giờ thành chuỗi DD/MM/YYYY HH:mm
const formatUTCDateTime = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
};

// Xuất Excel theo ngày
const exportSchedule = async (req, res) => {
  try {
    let query = {};
    if (req.query.ngay) {
      const { start, end } = buildUTCDateRange(req.query.ngay);
      query.ngayDi = { $gte: start, $lte: end };
    }

    const schedules = await Schedule.find(query);
    if (!schedules.length)
      return res.status(404).json({ error: "Không có lịch trình để xuất" });

    const data = [];
    const header = {
      "Ngày đi": "Ngày đi",
      "Ngày về": "Ngày về",
      "Tên lái xe": "Tên lái xe",
      "Biển số xe": "Biển số xe",
      "Tên khách hàng": "Tên khách hàng",
      "Giấy tờ": "Giấy tờ",
      "Nơi đi": "Nơi đi",
      "Nơi đến": "Nơi đến",
      "Trọng lượng hàng": "Trọng lượng hàng",
      "Số điểm": "Số điểm",
      "2 chiều & Lưu ca": "2 chiều & Lưu ca",
      Ăn: "Ăn",
      "Tăng ca": "Tăng ca",
      "Bốc xếp": "Bốc xếp",
      Vé: "Vé",
      "Tiền chuyến": "Tiền chuyến",
      "Chi phí khác": "Chi phí khác",
      "Tổng tiền lịch trình": "Tổng tiền lịch trình",
      "Lái xe thu khách": "Lái xe thu khách",
      "Phương án": "Phương án",
      "Mã lịch trình": "Mã lịch trình",
    };

    schedules.forEach((s) => {
      const formattedNgayDi = formatUTCDateTime(s.ngayDi);
      const formattedNgayVe = formatUTCDateTime(s.ngayVe);
      data.push(header);
      s.rows.forEach((row) => {
        data.push({
          "Ngày đi": formattedNgayDi,
          "Ngày về": formattedNgayVe,
          "Tên lái xe": s.tenLaiXe,
          "Biển số xe": row.bienSoXe,
          "Tên khách hàng": row.tenKhachHang,
          "Giấy tờ": row.giayTo,
          "Nơi đi": row.noiDi,
          "Nơi đến": row.noiDen,
          "Trọng lượng hàng": row.trongLuongHang,
          "Số điểm": row.soDiem,
          "2 chiều & Lưu ca": row.haiChieuVaLuuCa,
          Ăn: row.an,
          "Tăng ca": row.tangCa,
          "Bốc xếp": row.bocXep,
          Vé: row.ve,
          "Tiền chuyến": row.tienChuyen,
          "Chi phí khác": row.chiPhiKhac,
          "Tổng tiền lịch trình": "",
          "Lái xe thu khách": row.laiXeThuKhach,
          "Phương án":
            row.phuongAn === "daChuyenKhoan"
              ? "Đã chuyển khoản"
              : row.phuongAn === "truVaoTongLichTrinh"
                ? "Trừ vào tiền tổng"
                : "",
          "Mã lịch trình": row.maLichTrinh,
        });
      });
      data.push({
        "Ngày đi": formattedNgayDi,
        "Ngày về": formattedNgayVe,
        "Tên lái xe": s.tenLaiXe,
        "Chi phí khác": "Tổng",
        "Tổng tiền lịch trình": s.tongTienLichTrinh || "",
      });
      data.push({});
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch Trình");

    const ngayParam = req.query.ngay || new Date().toISOString().slice(0, 10);
    const fileName = `lichtrinh_${ngayParam.replace(/-/g, "_")}.xlsx`;
    const filePath = path.join(__dirname, "../", fileName);

    XLSX.writeFile(workbook, filePath);
    res.download(filePath, fileName, (err) => {
      if (!err) fs.unlinkSync(filePath);
    });
  } catch (err) {
    res.status(500).json({ error: "Xuất file thất bại" });
  }
};

// Xuất Excel theo khoảng ngày
const exportScheduleRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Thiếu tham số from hoặc to" });
    }

    const start = buildUTCDateRange(from).start;
    const end = buildUTCDateRange(to).end;

    const schedules = await Schedule.find({
      ngayDi: { $gte: start, $lte: end },
    });

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ error: "Không có lịch trình để xuất" });
    }

    const data = [];
    const header = {
      "Ngày đi": "Ngày đi",
      "Ngày về": "Ngày về",
      "Tên lái xe": "Tên lái xe",
      "Biển số xe": "Biển số xe",
      "Tên khách hàng": "Tên khách hàng",
      "Giấy tờ": "Giấy tờ",
      "Nơi đi": "Nơi đi",
      "Nơi đến": "Nơi đến",
      "Trọng lượng hàng": "Trọng lượng hàng",
      "Số điểm": "Số điểm",
      "2 chiều & Lưu ca": "2 chiều & Lưu ca",
      Ăn: "Ăn",
      "Tăng ca": "Tăng ca",
      "Bốc xếp": "Bốc xếp",
      Vé: "Vé",
      "Tiền chuyến": "Tiền chuyến",
      "Chi phí khác": "Chi phí khác",
      "Tổng tiền lịch trình": "Tổng tiền lịch trình",
      "Lái xe thu khách": "Lái xe thu khách",
      "Phương án": "Phương án",
      "Mã lịch trình": "Mã lịch trình",
    };

    schedules.forEach((s) => {
      const formattedNgayDi = formatUTCDateTime(s.ngayDi);
      const formattedNgayVe = formatUTCDateTime(s.ngayVe);

      data.push(header);

      s.rows.forEach((row) => {
        data.push({
          "Ngày đi": formattedNgayDi,
          "Ngày về": formattedNgayVe,
          "Tên lái xe": s.tenLaiXe,
          "Biển số xe": row.bienSoXe,
          "Tên khách hàng": row.tenKhachHang,
          "Giấy tờ": row.giayTo,
          "Nơi đi": row.noiDi,
          "Nơi đến": row.noiDen,
          "Trọng lượng hàng": row.trongLuongHang,
          "Số điểm": row.soDiem,
          "2 chiều & Lưu ca": row.haiChieuVaLuuCa,
          Ăn: row.an,
          "Tăng ca": row.tangCa,
          "Bốc xếp": row.bocXep,
          Vé: row.ve,
          "Tiền chuyến": row.tienChuyen,
          "Chi phí khác": row.chiPhiKhac,
          "Tổng tiền lịch trình": "",
          "Lái xe thu khách": row.laiXeThuKhach,
          "Phương án":
            row.phuongAn === "daChuyenKhoan"
              ? "Đã chuyển khoản"
              : row.phuongAn === "truVaoTongLichTrinh"
                ? "Trừ vào tiền tổng"
                : "",
          "Mã lịch trình": row.maLichTrinh,
        });
      });

      data.push({
        "Ngày đi": formattedNgayDi,
        "Ngày về": formattedNgayVe,
        "Tên lái xe": s.tenLaiXe,
        "Chi phí khác": "Tổng",
        "Tổng tiền lịch trình": s.tongTienLichTrinh || "",
      });

      data.push({});
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch Trình");

    const safeFrom = from.replace(/-/g, "_");
    const safeTo = to.replace(/-/g, "_");

    const fileName = `lichtrinh_${safeFrom}_den_${safeTo}.xlsx`;
    const filePath = path.join(__dirname, "../", fileName);

    XLSX.writeFile(workbook, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Lỗi gửi file:", err);
        res.status(500).send("Lỗi gửi file");
      } else {
        fs.unlinkSync(filePath);
      }
    });
  } catch (err) {
    console.error("Lỗi xuất Excel theo khoảng ngày:", err);
    res.status(500).json({ error: "Xuất file thất bại" });
  }
};

// Xuất Excel theo ngày tạo (createdAt)
const exportScheduleByCreatedDate = async (req, res) => {
  try {
    const { ngay } = req.query;
    if (!ngay) {
      return res.status(400).json({ error: "Thiếu tham số ngay (YYYY-MM-DD)" });
    }

    const start = buildCreatedAtVN(ngay);
    const end = buildCreatedAtVN(ngay, true);

    console.log("📤 Export createdAt (UTC) từ:", start.toISOString());
    console.log("📤 Export createdAt (UTC) đến:", end.toISOString());

    const schedules = await Schedule.find({
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    if (!schedules.length) {
      return res.status(404).json({ error: "Không có lịch trình để xuất" });
    }

    const data = [];
    const header = {
      "Ngày đi": "Ngày đi",
      "Ngày về": "Ngày về",
      "Tên lái xe": "Tên lái xe",
      "Biển số xe": "Biển số xe",
      "Tên khách hàng": "Tên khách hàng",
      "Giấy tờ": "Giấy tờ",
      "Nơi đi": "Nơi đi",
      "Nơi đến": "Nơi đến",
      "Trọng lượng hàng": "Trọng lượng hàng",
      "Số điểm": "Số điểm",
      "2 chiều & Lưu ca": "2 chiều & Lưu ca",
      Ăn: "Ăn",
      "Tăng ca": "Tăng ca",
      "Bốc xếp": "Bốc xếp",
      Vé: "Vé",
      "Tiền chuyến": "Tiền chuyến",
      "Chi phí khác": "Chi phí khác",
      "Tổng tiền lịch trình": "Tổng tiền lịch trình",
      "Lái xe thu khách": "Lái xe thu khách",
      "Phương án": "Phương án",
      "Mã lịch trình": "Mã lịch trình",
    };

    schedules.forEach((s) => {
      const formattedNgayDi = formatUTCDateTime(s.ngayDi);
      const formattedNgayVe = formatUTCDateTime(s.ngayVe);

      data.push(header);

      s.rows.forEach((row) => {
        data.push({
          "Ngày đi": formattedNgayDi,
          "Ngày về": formattedNgayVe,
          "Tên lái xe": s.tenLaiXe,
          "Biển số xe": row.bienSoXe,
          "Tên khách hàng": row.tenKhachHang,
          "Giấy tờ": row.giayTo,
          "Nơi đi": row.noiDi,
          "Nơi đến": row.noiDen,
          "Trọng lượng hàng": row.trongLuongHang,
          "Số điểm": row.soDiem,
          "2 chiều & Lưu ca": row.haiChieuVaLuuCa,
          Ăn: row.an,
          "Tăng ca": row.tangCa,
          "Bốc xếp": row.bocXep,
          Vé: row.ve,
          "Tiền chuyến": row.tienChuyen,
          "Chi phí khác": row.chiPhiKhac,
          "Tổng tiền lịch trình": "",
          "Lái xe thu khách": row.laiXeThuKhach,
          "Phương án":
            row.phuongAn === "daChuyenKhoan"
              ? "Đã chuyển khoản"
              : row.phuongAn === "truVaoTongLichTrinh"
                ? "Trừ vào tiền tổng"
                : "",
          "Mã lịch trình": row.maLichTrinh,
        });
      });

      data.push({
        "Ngày đi": formattedNgayDi,
        "Ngày về": formattedNgayVe,
        "Tên lái xe": s.tenLaiXe,
        "Chi phí khác": "Tổng",
        "Tổng tiền lịch trình": s.tongTienLichTrinh || "",
      });

      data.push({});
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch Trình");

    const fileName = `lichtrinh_createdAt_${ngay.replace(/-/g, "_")}.xlsx`;
    const filePath = path.join(__dirname, "../", fileName);

    XLSX.writeFile(workbook, filePath);
    res.download(filePath, fileName, () => fs.unlinkSync(filePath));
  } catch (err) {
    console.error("❌ exportScheduleByCreatedDate error:", err);
    res.status(500).json({ error: "Xuất file thất bại" });
  }
};

// Xuất Excel theo khoảng ngày tạo (createdAt)
const exportScheduleByCreatedRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Thiếu from hoặc to" });
    }

    const start = buildCreatedAtVN(from);
    const end = buildCreatedAtVN(to, true);

    console.log("📤 Export createdAt (UTC) từ:", start.toISOString());
    console.log("📤 Export createdAt (UTC) đến:", end.toISOString());

    const schedules = await Schedule.find({
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    if (!schedules.length) {
      return res.status(404).json({ error: "Không có lịch trình để xuất" });
    }

    const data = [];
    const header = {
      "Ngày đi": "Ngày đi",
      "Ngày về": "Ngày về",
      "Tên lái xe": "Tên lái xe",
      "Biển số xe": "Biển số xe",
      "Tên khách hàng": "Tên khách hàng",
      "Giấy tờ": "Giấy tờ",
      "Nơi đi": "Nơi đi",
      "Nơi đến": "Nơi đến",
      "Trọng lượng hàng": "Trọng lượng hàng",
      "Số điểm": "Số điểm",
      "2 chiều & Lưu ca": "2 chiều & Lưu ca",
      Ăn: "Ăn",
      "Tăng ca": "Tăng ca",
      "Bốc xếp": "Bốc xếp",
      Vé: "Vé",
      "Tiền chuyến": "Tiền chuyến",
      "Chi phí khác": "Chi phí khác",
      "Tổng tiền lịch trình": "Tổng tiền lịch trình",
      "Lái xe thu khách": "Lái xe thu khách",
      "Phương án": "Phương án",
      "Mã lịch trình": "Mã lịch trình",
    };

    schedules.forEach((s) => {
      const formattedNgayDi = formatUTCDateTime(s.ngayDi);
      const formattedNgayVe = formatUTCDateTime(s.ngayVe);

      data.push(header);

      s.rows.forEach((row) => {
        data.push({
          "Ngày đi": formattedNgayDi,
          "Ngày về": formattedNgayVe,
          "Tên lái xe": s.tenLaiXe,
          "Biển số xe": row.bienSoXe,
          "Tên khách hàng": row.tenKhachHang,
          "Giấy tờ": row.giayTo,
          "Nơi đi": row.noiDi,
          "Nơi đến": row.noiDen,
          "Trọng lượng hàng": row.trongLuongHang,
          "Số điểm": row.soDiem,
          "2 chiều & Lưu ca": row.haiChieuVaLuuCa,
          Ăn: row.an,
          "Tăng ca": row.tangCa,
          "Bốc xếp": row.bocXep,
          Vé: row.ve,
          "Tiền chuyến": row.tienChuyen,
          "Chi phí khác": row.chiPhiKhac,
          "Tổng tiền lịch trình": "",
          "Lái xe thu khách": row.laiXeThuKhach,
          "Phương án":
            row.phuongAn === "daChuyenKhoan"
              ? "Đã chuyển khoản"
              : row.phuongAn === "truVaoTongLichTrinh"
                ? "Trừ vào tiền tổng"
                : "",
          "Mã lịch trình": row.maLichTrinh,
        });
      });

      data.push({
        "Ngày đi": formattedNgayDi,
        "Ngày về": formattedNgayVe,
        "Tên lái xe": s.tenLaiXe,
        "Chi phí khác": "Tổng",
        "Tổng tiền lịch trình": s.tongTienLichTrinh || "",
      });

      data.push({});
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch Trình");

    const safeFrom = from.replace(/[:\-T]/g, "_");
    const safeTo = to.replace(/[:\-T]/g, "_");

    const fileName = `lichtrinh_createdAt_${safeFrom}_den_${safeTo}.xlsx`;
    const filePath = path.join(__dirname, "../", fileName);

    XLSX.writeFile(workbook, filePath);
    res.download(filePath, fileName, () => fs.unlinkSync(filePath));
  } catch (err) {
    console.error("❌ exportScheduleByCreatedRange error:", err);
    res.status(500).json({ error: "Xuất file thất bại" });
  }
};

module.exports = {
  createSchedule,
  getSchedulesByDate,
  getSchedulesByRange,
  getSchedulesByCreatedDate,
  getSchedulesByCreatedRange,
  deleteSchedulesByDate,
  deleteSchedulesByRange,
  exportSchedule,
  exportScheduleRange,
  exportScheduleByCreatedRange,
  exportScheduleByCreatedDate,
};
