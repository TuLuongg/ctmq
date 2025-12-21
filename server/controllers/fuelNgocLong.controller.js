const ExcelJS = require("exceljs");
const FuelNgocLong = require("../models/FuelNgocLong");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
======================= */
exports.getAll = async (req, res) => {
  try {
    const { month, vehiclePlates } = req.query; // vehiclePlates là mảng string dạng JSON: ["31A-123", "29C-456"]

    const filter = {};

    // Lọc theo tháng
    if (month) {
      const [year, mon] = month.split("-");
      const startDate = new Date(Number(year), Number(mon) - 1, 1);
      const endDate = new Date(Number(year), Number(mon), 0, 23, 59, 59, 999);
      filter.dateFull = { $gte: startDate, $lte: endDate };
    }

    // Lọc theo mảng vehiclePlates
    if (vehiclePlates) {
      let arr = [];
      try {
        arr = JSON.parse(vehiclePlates);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }

      if (arr.length > 0) {
        filter.vehiclePlate = { $in: arr };
      }
    }

    const data = await FuelNgocLong.find(filter).sort({ dateFull: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH VEHICLEPLATE DUY NHẤT
======================= */
exports.getUniqueVehiclePlates = async (req, res) => {
  try {
    // Lấy tất cả vehiclePlate duy nhất, không lọc tháng
    const vehiclePlates = await FuelNgocLong.distinct("vehiclePlate");

    // Sắp xếp alphabet
    vehiclePlates.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    res.json(vehiclePlates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* =======================
   THÊM
======================= */
exports.create = async (req, res) => {
  try {
    const data = await FuelNgocLong.create(req.body);
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
    const data = await FuelNgocLong.findByIdAndUpdate(id, req.body, {
      new: true,
    });
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
    await FuelNgocLong.findByIdAndDelete(req.params.id);
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
    await FuelNgocLong.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (GHI ĐÈ THEO BIỂN SỐ XE)
======================= */
function parseExcelDate(val) {
  if (!val) return null;

  // Đã là Date object
  if (val instanceof Date) return val;

  // Object ExcelJS
  if (typeof val === "object") {
    val = val.text || val.result || null;
  }

  if (typeof val === "string") {
    const parts = val.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
  }

  return null;
}

function toNumber(val) {
  if (val === null || val === undefined || val === "") return null;

  // ExcelJS object
  if (typeof val === "object") {
    val = val.result ?? val.text ?? null;
  }

  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }

  if (typeof val !== "string") return null;

  let s = val.trim();
  if (!s) return null;

  // ❌ loại text không có số (vd: "Tháng 12/2025")
  if (!/\d/.test(s)) return null;

  // ===== QUY ƯỚC VN =====
  // .  → phân cách nghìn → xoá
  // ,  → thập phân → đổi thành .
  s = s.replace(/\./g, "").replace(",", ".");

  const num = Number(s);
  return isNaN(num) ? null : num;
}


exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let inserted = 0;
    let skipped = 0;

    for (let i = 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const vehiclePlate = row.getCell(3).value;
      if (!vehiclePlate) {
        skipped++;
        continue;
      }

      const dateFull = parseExcelDate(row.getCell(1).value);
      const day = toNumber(row.getCell(2).value);
      const amount = toNumber(row.getCell(5).value);
      const liter = toNumber(row.getCell(6).value);

      // ❌ Không phải dòng dữ liệu
      if (!dateFull || day === null || amount === null || liter === null) {
        skipped++;
        continue;
      }

      const payload = {
        dateFull,
        day,
        vehiclePlate,
        vehicleCode: row.getCell(4).value,
        amount,
        liter,
        note: row.getCell(7)?.value || null,
        cumulativeMechanical1: toNumber(row.getCell(8)?.value),
        cumulativeMechanical2: toNumber(row.getCell(9)?.value),
        cumulativeElectronic1: toNumber(row.getCell(10)?.value),
        cumulativeElectronic2: toNumber(row.getCell(11)?.value),
        internalFuelPrice: toNumber(row.getCell(12)?.value),
        fuelRemaining: toNumber(row.getCell(13)?.value),
      };

      await FuelNgocLong.create(payload);
      inserted++;
    }

    res.json({ success: true, inserted, skipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

