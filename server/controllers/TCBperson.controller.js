const TCBperson = require("../models/TCBperson");
const ExcelJS = require("exceljs");

// Helper parse ngày từ Excel
const parseExcelDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (!isNaN(d)) return d;
  const parts = val.split("/");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const parsed = new Date(`${yyyy}-${mm}-${dd}`);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

// Helper parse số
const parseNumber = (val) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// ===================
// Thêm mới
// ===================
exports.create = async (req, res) => {
  try {
    const { timePay, noiDungCK, soTien, soDu, khachHang, keToan, ghiChu, maChuyen } =
      req.body;
    const newItem = new TCBperson({
      timePay: parseExcelDate(timePay),
      noiDungCK,
      soTien: parseNumber(soTien),
      soDu: parseNumber(soDu),
      khachHang,
      keToan,
      ghiChu,
      maChuyen
    });
    await newItem.save();
    res.json({ success: true, data: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Sửa
// ===================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { timePay, noiDungCK, soTien, soDu, khachHang, keToan, ghiChu, maChuyen } =
      req.body;
    const updated = await TCBperson.findByIdAndUpdate(
      id,
      {
        timePay: parseExcelDate(timePay),
        noiDungCK,
        soTien: parseNumber(soTien),
        soDu: parseNumber(soDu),
        khachHang,
        keToan,
        ghiChu,
        maChuyen
      },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Không tìm thấy bản ghi" });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Xóa 1
// ===================
exports.deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TCBperson.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Không tìm thấy bản ghi" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Xóa tất cả
// ===================
exports.deleteAll = async (req, res) => {
  try {
    await TCBperson.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Lấy danh sách khách hàng duy nhất
// ===================
exports.getCustomers = async (req, res) => {
  try {
    const customers = await TCBperson.distinct("khachHang");
    res.json({ success: true, data: customers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Lấy danh sách kế toán duy nhất
// ===================
exports.getAccountants = async (req, res) => {
  try {
    const accountants = await TCBperson.distinct("keToan");
    res.json({ success: true, data: accountants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Lấy tất cả data với lọc
// ===================
exports.getAll = async (req, res) => {
  try {
    const {
      // ===== ARRAY (GIỮ NGUYÊN) =====
      khachHang = [],
      keToan = [],

      // ===== STRING (LỌC ĐƠN) =====
      noiDungCK,
      ghiChu,
      maChuyen,

      // ===== NUMBER (LỌC ĐƠN) =====
      soTien,
      soDu,

      // ===== DATE RANGE =====
      from,
      to,

      // ===== PAGINATION =====
      page = 1,
    } = req.body;

    const filter = {};

    // ---------- ARRAY ----------
    if (khachHang.length) {
      filter.khachHang = { $in: khachHang };
    }

    if (keToan.length) {
      filter.keToan = { $in: keToan };
    }

    // ---------- STRING (đơn) ----------
    if (noiDungCK) {
      filter.noiDungCK = { $regex: noiDungCK, $options: "i" };
    }

    if (ghiChu) {
      filter.ghiChu = { $regex: ghiChu, $options: "i" };
    }

    if (maChuyen) {
      filter.maChuyen = { $regex: maChuyen, $options: "i" };
    }

    // ---------- NUMBER (đơn) ----------
    if (soTien !== undefined && soTien !== "") {
      filter.soTien = Number(soTien);
    }

    if (soDu !== undefined && soDu !== "") {
      filter.soDu = Number(soDu);
    }

    // ---------- DATE ----------
    if (from || to) {
      filter.timePay = {};
      if (from) filter.timePay.$gte = new Date(from);
      if (to) filter.timePay.$lte = new Date(to);
    }

    // ---------- PAGINATION ----------
    const pageSize = 100;
    const skip = (page - 1) * pageSize;

    const total = await TCBperson.countDocuments(filter);

    const data = await TCBperson.find(filter)
      .sort({ timePay: 1 })
      .skip(skip)
      .limit(pageSize);

    res.json({
      success: true,
      page: Number(page),
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// ===================
// Import Excel
// ===================
exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Không có file Excel" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const bulk = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const timePay = parseExcelDate(row.getCell(2)?.value);
      const noiDungCK = row.getCell(3)?.value?.toString().trim() || "";
      const soTien = parseNumber(row.getCell(4)?.value);
      const soDu = parseNumber(row.getCell(5)?.value);
      const khachHang = row.getCell(6)?.value?.toString().trim() || "";
      const keToan = row.getCell(7)?.value?.toString().trim() || "";
      const ghiChu = row.getCell(8)?.value?.toString().trim() || "";
      const maChuyen = row.getCell(9)?.value?.toString().trim() || "";

      if (!khachHang || !noiDungCK) continue; // bắt buộc có khách hàng và nội dung
      bulk.push({
        timePay,
        noiDungCK,
        soTien,
        soDu,
        khachHang,
        keToan,
        ghiChu,
        maChuyen
      });
    }

    let inserted = 0;
    if (bulk.length > 0) {
      await TCBperson.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
