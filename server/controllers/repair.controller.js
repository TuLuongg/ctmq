const ExcelJS = require("exceljs");
const Repair = require("../models/Repair");

/* =======================
   LẤY DỮ LIỆU CÓ THÊM FILTER
======================= */
exports.getAll = async (req, res) => {
  try {
    const { vehiclePlates, repairUnits } = req.query;
    // vehiclePlates & repairUnits là mảng string dạng JSON: ["31A-123", "29C-456"]

    const filter = {};

    // Lọc theo mảng vehiclePlate
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

    // Lọc theo mảng repairUnit
    if (repairUnits) {
      let arr = [];
      try {
        arr = JSON.parse(repairUnits);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        filter.repairUnit = { $in: arr };
      }
    }

    const data = await Repair.find(filter).sort({ repairDate: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH vehiclePlate DUY NHẤT 
======================= */
exports.getUniqueVehiclePlates = async (req, res) => {
  try {
    const vehiclePlates = await Repair.distinct("vehiclePlate");
    vehiclePlates.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    res.json(vehiclePlates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH repairUnit DUY NHẤT 
======================= */
exports.getUniqueRepairUnits = async (req, res) => {
  try {
    const repairUnits = await Repair.distinct("repairUnit");
    repairUnits.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    res.json(repairUnits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM
======================= */
exports.create = async (req, res) => {
  try {
    const data = await Repair.create(req.body);
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
    const data = await Repair.findByIdAndUpdate(id, req.body, { new: true });
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
    await Repair.findByIdAndDelete(req.params.id);
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
    await Repair.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (THEO vehiclePlate)
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

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      // Lùi 1 cột: STT là cột 1, dữ liệu bắt đầu từ cột 2
      const repairUnit = row.getCell(2)?.value || "";
      const repairDate = row.getCell(3)?.value || new Date();
      const vehiclePlate = row.getCell(4)?.value;
      if (!vehiclePlate || String(vehiclePlate).trim() === "") continue; // Bỏ dòng không có vehiclePlate

      totalValid++;

      bulk.push({
        repairUnit,
        repairDate:
          repairDate instanceof Date ? repairDate : new Date(repairDate),
        vehiclePlate: String(vehiclePlate).trim(),
        repairDetails: row.getCell(5)?.value || "",
        unit: row.getCell(6)?.value || "",
        quantity: Number(row.getCell(7)?.value || 0),
        unitPrice: Number(row.getCell(8)?.value || 0), // Đơn giá
        totalAmount:
          Number(row.getCell(7)?.value || 0) *
          Number(row.getCell(8)?.value || 0), // Tự tính
        discount: row.getCell(10)?.value ? String(row.getCell(10)?.value) : "", // Ép về string
        warrantyDays: Number(row.getCell(11)?.value || 0),
        warrantyEndDate: row.getCell(12)?.value
          ? new Date(row.getCell(12)?.value)
          : null,
        note: row.getCell(13)?.value || "",
        paymentDate: row.getCell(14)?.value
          ? new Date(row.getCell(14)?.value)
          : null,
      });
    }

    if (bulk.length > 0) {
      await Repair.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, totalValid, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
