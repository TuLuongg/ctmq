const ExcelJS = require("exceljs");
const EpassMonth = require("../models/EpassMonth");


/* =========================
   THÊM MỚI
========================= */
exports.create = async (req, res) => {
  try {
    const doc = await EpassMonth.create(req.body);
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   SỬA
========================= */
exports.update = async (req, res) => {
  try {
    const doc = await EpassMonth.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Không tìm thấy dữ liệu" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   XOÁ 1
========================= */
exports.removeOne = async (req, res) => {
  try {
    await EpassMonth.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   XOÁ TẤT CẢ
========================= */
exports.removeAll = async (req, res) => {
  try {
    await EpassMonth.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   LẤY DANH SÁCH BIỂN SỐ XE DUY NHẤT
========================= */
exports.getUniqueBSX = async (req, res) => {
  try {
    const list = await EpassMonth.distinct("bienSoXe");
    res.json(list.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   LẤY TẤT CẢ DATA (LỌC THEO MẢNG BSX)
   ?bienSoXe=["30A-123","29B-456"]
========================= */
exports.getAll = async (req, res) => {
  try {
    let filter = {};

    if (req.query.bienSoXe) {
      const arr = JSON.parse(req.query.bienSoXe);
      if (Array.isArray(arr) && arr.length > 0) {
        filter.bienSoXe = { $in: arr };
      }
    }

    const data = await EpassMonth.find(filter).sort({
      bienSoXe: 1,
      dayFrom: 1,
    });

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   IMPORT EXCEL
   THỨ TỰ CỘT:
   1. Biển số xe
   2. Trạm / đoạn
   3. Loại vé
   4. Số tiền
   5. Ngày mua
   6. Từ ngày
   7. Đến ngày
========================= */
const parseDate = (value) => {
  if (!value) return null;

  // Excel trả Date object
  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  // Excel trả string: Fri Nov 28 00:00:00 ICT 2025
  if (typeof value === "string") {
    const cleaned = value.replace(" ICT", "");
    const d = new Date(cleaned);
    if (!isNaN(d)) return d;
  }

  return null;
};

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa chọn file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let inserted = 0;
    const docs = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // bỏ header

      const [
        bienSoXe,
        tramDoan,
        loaiVe,
        moneyAmount,
        dayBuy,
        dayFrom,
        dayTo,
      ] = row.values.slice(1);

      if (!bienSoXe || !tramDoan) return;

      docs.push({
        bienSoXe: String(bienSoXe).trim(),
        tramDoan: String(tramDoan).trim(),
        loaiVe: loaiVe ? String(loaiVe).trim() : "",
        moneyAmount: Number(moneyAmount || 0),
        dayBuy: parseDate(dayBuy),
        dayFrom: parseDate(dayFrom),
        dayTo: parseDate(dayTo),
      });

      inserted++;
    });

    if (docs.length > 0) {
      await EpassMonth.insertMany(docs);
    }

    res.json({
      inserted,
      total: docs.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
