const ExcelJS = require("exceljs");
const VehicleLegal = require("../models/VehicleLegal");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehicleNos } = req.query; // vehicleNos là mảng string dạng JSON: ["31A-123", "29C-456"]

    const filter = {};

    // Lọc theo tháng dựa vào ngàyGhiTang
    if (month) {
      const [year, mon] = month.split("-");
      const startDate = new Date(Number(year), Number(mon) - 1, 1);
      const endDate = new Date(Number(year), Number(mon), 0, 23, 59, 59, 999);
      filter.ngayGhiTang = { $gte: startDate, $lte: endDate };
    }

    // Lọc theo mảng vehicleNo
    if (vehicleNos) {
      let arr = [];
      try {
        arr = JSON.parse(vehicleNos);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.bienSoXe = { $in: arr };
      }
    }

    const data = await VehicleLegal.find(filter).sort({ ngayGhiTang: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH BIỂN SỐ XE DUY NHẤT
======================= */
exports.getUniqueVehicleNos = async (req, res) => {
  try {
    const vehicleNos = await VehicleLegal.distinct("bienSoXe");
    vehicleNos.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    res.json(vehicleNos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM
======================= */
exports.create = async (req, res) => {
  try {
    const data = await VehicleLegal.create(req.body);
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
    const data = await VehicleLegal.findByIdAndUpdate(id, req.body, { new: true });
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
    await VehicleLegal.findByIdAndDelete(req.params.id);
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
    await VehicleLegal.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (GHI ĐÈ THEO BIỂN SỐ XE)
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let totalValid = 0;
    let inserted = 0;
    const bulk = [];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const bienSoXe = row.getCell(3).value;
      if (!bienSoXe || String(bienSoXe).trim() === "") continue; // ❗ BỎ DÒNG KHÔNG CÓ BIỂN SỐ XE

      totalValid++;

      bulk.push({
        maCCDC: row.getCell(1)?.value || "",
        tenCCDE: row.getCell(2)?.value || "",
        bienSoXe: String(bienSoXe).trim(),
        typeCCDC: row.getCell(4)?.value || "",
        reason: row.getCell(5)?.value || "",
        ngayGhiTang: row.getCell(6)?.value || null,
        soCT: row.getCell(7)?.value || "",
        soKyPB: row.getCell(8)?.value || 0,
        soKyPBconlai: row.getCell(9)?.value || 0,
        valueCCDC: row.getCell(10)?.value || 0,
        valuePB: row.getCell(11)?.value || 0,
        pbk: row.getCell(12)?.value || 0,
        lkPB: row.getCell(13)?.value || 0,
        valueOld: row.getCell(14)?.value || 0,
        tkPB: row.getCell(15)?.value || "",
      });
    }

    if (bulk.length > 0) {
      await VehicleLegal.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, totalValid, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
