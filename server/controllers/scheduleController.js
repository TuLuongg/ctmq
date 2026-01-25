const Schedule = require("../models/Schedule");
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

// Tạo lịch trình mới
const createSchedule = async (req, res) => {
  try {
    const { tenLaiXe, ngayDi, ngayVe, tongTienLichTrinh, rows } = req.body;
    const processedRows = rows.map(mapFieldsToRow);

    const parseLocalDateTime = (str) => {
      const [datePart, timePart] = str.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hour, minute);
    };

    const schedule = new Schedule({
      tenLaiXe: String(tenLaiXe || ""),
      ngayDi: parseLocalDateTime(ngayDi),
      ngayVe: parseLocalDateTime(ngayVe),
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

// Lấy lịch trình theo ngày
const getSchedulesByDate = async (req, res) => {
  try {
    let query = {};
    if (req.query.ngay) {
      const start = new Date(req.query.ngay);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.query.ngay);
      end.setHours(23, 59, 59, 999);
      query.ngayDi = { $gte: start, $lt: end };
    }
    const schedules = await Schedule.find(query);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy lịch trình theo khoảng ngày
const getSchedulesByRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ error: "Thiếu from hoặc to" });
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    const schedules = await Schedule.find({
      ngayDi: { $gte: start, $lte: end },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xóa lịch trình theo ngày
const deleteSchedulesByDate = async (req, res) => {
  try {
    if (!req.query.ngay)
      return res.status(400).json({ error: "Thiếu tham số ngày" });
    const start = new Date(req.query.ngay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(req.query.ngay);
    end.setHours(23, 59, 59, 999);
    const result = await Schedule.deleteMany({
      ngayDi: { $gte: start, $lt: end },
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
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
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

// Xuất Excel theo ngày
const exportSchedule = async (req, res) => {
  try {
    let query = {};
    if (req.query.ngay) {
      const start = new Date(req.query.ngay);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.query.ngay);
      end.setHours(23, 59, 59, 999);
      query.ngayDi = { $gte: start, $lt: end };
    }

    const schedules = await Schedule.find(query);
    if (!schedules.length)
      return res.status(404).json({ error: "Không có lịch trình để xuất" });

    const formatUTCDateTime = (date) => {
      if (!(date instanceof Date) || isNaN(date)) return "";
      return `${String(date.getUTCDate()).padStart(2, "0")}/${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}/${date.getUTCFullYear()} ${String(
        date.getUTCHours()
      ).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
    };

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

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const schedules = await Schedule.find({
      ngayDi: { $gte: start, $lte: end },
    });

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ error: "Không có lịch trình để xuất" });
    }

    const formatUTCDateTime = (date) => {
      if (!(date instanceof Date) || isNaN(date)) return "";
      const day = String(date.getUTCDate()).padStart(2, "0");
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const year = date.getUTCFullYear();
      const hour = String(date.getUTCHours()).padStart(2, "0");
      const minute = String(date.getUTCMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hour}:${minute}`;
    };

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

module.exports = {
  createSchedule,
  getSchedulesByDate,
  getSchedulesByRange,
  deleteSchedulesByDate,
  deleteSchedulesByRange,
  exportSchedule,
  exportScheduleRange,
};
