const ExcelJS = require("exceljs");
const Tire = require("../models/Tire");

/* =======================
   LẤY TẤT CẢ DỮ LIỆU CÓ THÊM FILTER
   query: ?vehiclePlates=["31A-123","29C-456"]
======================= */
exports.getAll = async (req, res) => {
  try {
    const { vehiclePlates } = req.query;
    const filter = {};

    if (vehiclePlates) {
      let arr = [];
      try {
        arr = JSON.parse(vehiclePlates);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        filter.bienSoXe = { $in: arr };
      }
    }

    const data = await Tire.find(filter).sort({ ngay: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH bienSoXe DUY NHẤT
======================= */
exports.getUniqueVehiclePlates = async (req, res) => {
  try {
    const vehiclePlates = await Tire.distinct("bienSoXe");
    vehiclePlates.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    res.json(vehiclePlates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM 1 BẢN GHI
======================= */
exports.create = async (req, res) => {
  try {
    const data = await Tire.create(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   SỬA
======================= */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Tire.findByIdAndUpdate(id, req.body, { new: true });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ 1
======================= */
exports.remove = async (req, res) => {
  try {
    await Tire.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ TẤT CẢ
======================= */
exports.removeAll = async (req, res) => {
  try {
    await Tire.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (THEO bienSoXe)
   Lưu ý: dữ liệu giữ nguyên, không tính toán
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Không có file Excel" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let totalValid = 0;
    let inserted = 0;
    const bulk = [];

    // Hàm helper chuyển sang number và fallback 0 nếu NaN
    const parseNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const nhaCungCap = row.getCell(1)?.value || "";
      const ngay = row.getCell(2)?.value ? new Date(row.getCell(2)?.value) : null;
      const bienSoXe = row.getCell(3)?.value;
      if (!bienSoXe || String(bienSoXe).trim() === "") continue; // Bỏ dòng không có biển số

      const ruaXe = parseNumber(row.getCell(4)?.value);
      const bomMo = parseNumber(row.getCell(5)?.value);
      const canHoi = ruaXe + bomMo; // Cân hơi = bơm mỡ + rửa xe

      totalValid++;

      bulk.push({
        nhaCungCap,
        ngay,
        bienSoXe: String(bienSoXe).trim(),
        ruaXe,
        bomMo,
        canHoi,
        catTham: parseNumber(row.getCell(7)?.value),
        chiPhiKhac: parseNumber(row.getCell(8)?.value),
        thayLopDoiLop: row.getCell(9)?.value,
        soLuongLop: parseNumber(row.getCell(10)?.value),
        donGiaLop: parseNumber(row.getCell(11)?.value),
        thanhTienLop: parseNumber(row.getCell(12)?.value),
        tongChiPhi: parseNumber(row.getCell(13)?.value),
        ghiChu: row.getCell(14)?.value || "",
      });
    }

    if (bulk.length > 0) {
      await Tire.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, totalValid, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
