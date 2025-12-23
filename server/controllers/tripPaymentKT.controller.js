const TripPaymentKT = require("../models/TripPaymentKT");
const ExcelJS = require("exceljs");

/**
 * =========================
 * ➕ THÊM
 * =========================
 */
exports.createTripPaymentKT = async (req, res) => {
  try {
    const data = await TripPaymentKT.create(req.body);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * =========================
 * ✏️ SỬA
 * =========================
 */
exports.updateTripPaymentKT = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await TripPaymentKT.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * =========================
 * ❌ XOÁ 1
 * =========================
 */
exports.deleteTripPaymentKT = async (req, res) => {
  try {
    const { id } = req.params;
    await TripPaymentKT.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * =========================
 * 📋 LẤY TẤT CẢ + FILTER
 * filter:
 *  - from, to (ngayThang)
 *  - tenLaiXe: []
 *  - bienSoXe: []
 * =========================
 */
exports.getAllTripPaymentKT = async (req, res) => {
  try {
    const {
      from,
      to,
      tenLaiXe = [],
      bienSoXe = [],
      page = 1,
      limit = 100,
    } = req.query;

    const filter = {};

    /* ===== FILTER NGÀY ===== */
    if (from || to) {
      filter.ngayThang = {};
      if (from) filter.ngayThang.$gte = new Date(from);
      if (to) filter.ngayThang.$lte = new Date(to);
    }

    /* ===== FILTER TÊN LÁI XE ===== */
    if (tenLaiXe && tenLaiXe.length) {
      filter.tenLaiXe = {
        $in: Array.isArray(tenLaiXe) ? tenLaiXe : [tenLaiXe],
      };
    }

    /* ===== FILTER BIỂN SỐ XE ===== */
    if (bienSoXe && bienSoXe.length) {
      filter.bienSoXe = {
        $in: Array.isArray(bienSoXe) ? bienSoXe : [bienSoXe],
      };
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    /* ===== QUERY SONG SONG ===== */
    const [data, total] = await Promise.all([
      TripPaymentKT.find(filter)
        .sort({ ngayThang: 1 })
        .skip(skip)
        .limit(limitNum),
      TripPaymentKT.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * =========================
 * 👨‍✈️ DANH SÁCH TÊN LÁI XE (UNIQUE)
 * =========================
 */
exports.getUniqueDriverNames = async (req, res) => {
  try {
    const data = await TripPaymentKT.distinct("tenLaiXe");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * =========================
 * DANH SÁCH BSX (UNIQUE)
 * =========================
 */
exports.getUniqueLicensePlates = async (req, res) => {
  try {
    const data = await TripPaymentKT.distinct("bienSoXe");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * =========================
 * 🗑 XOÁ THEO KHOẢNG NGÀY
 * =========================
 */
exports.deleteByDateRange = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Thiếu from / to" });
    }

    const result = await TripPaymentKT.deleteMany({
      ngayThang: {
        $gte: new Date(from),
        $lte: new Date(to),
      },
    });

    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/**
 * =========================
 * 📥 IMPORT EXCEL (ĐÚNG THỨ TỰ)
 * Thứ tự cột:
 * 1. tenLaiXe
 * 2. bienSoXe
 * 3. ngayThang
 * 4. totalMoney
 * 5. ghiChu
 * 6. dayPayment
 * =========================
 */
exports.importTripPaymentKTExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const rows = [];

    sheet.eachRow((row, index) => {
      if (index === 1) return; // bỏ header

      rows.push({
        tenLaiXe: row.getCell(2).value?.toString().trim(),
        bienSoXe: row.getCell(3).value?.toString().trim(),
        ngayThang: row.getCell(4).value
          ? new Date(row.getCell(4).value)
          : null,
        totalMoney: Number(row.getCell(5).value || 0),
        ghiChu: row.getCell(6).value?.toString() || "",
        dayPayment: row.getCell(7).value
          ? new Date(row.getCell(7).value)
          : null,
      });
    });

    await TripPaymentKT.insertMany(rows);
    res.json({ success: true, inserted: rows.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
