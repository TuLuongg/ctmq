const ExcelJS = require("exceljs");
const FuelVinhKhuc = require("../models/FuelVinhKhuc");

exports.getAll = async (req, res) => {
  try {
    const data = await FuelVinhKhuc.find().sort({ dateFull: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* =======================
   THÊM
======================= */
exports.create = async (req, res) => {
  try {
    const data = await FuelVinhKhuc.create(req.body);
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
    const data = await FuelVinhKhuc.findByIdAndUpdate(id, req.body, {
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
    await FuelVinhKhuc.findByIdAndDelete(req.params.id);
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
    await FuelVinhKhuc.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (GHI ĐÈ THEO SỐ XE)
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

      const vehicleNo = row.getCell(3).value;
      if (!vehicleNo || String(vehicleNo).trim() === "") {
        continue; // ❗ BỎ DÒNG KHÔNG CÓ SỐ XE
      }

      totalValid++;

      bulk.push({
        dateFull: row.getCell(1).value || null,
        day: row.getCell(2).value || null,
        vehicleNo: String(vehicleNo).trim(),
        vehicleCode: row.getCell(4)?.value || "",
        amount: row.getCell(5)?.value || 0,
        liter: row.getCell(6)?.value || 0,
        outsideAmount: row.getCell(7)?.value || 0,
        outsideLiter: row.getCell(8)?.value || 0,
        totalAmount: row.getCell(9)?.value || 0,
        fuelPriceChanged: row.getCell(10)?.value || 0,
        note: row.getCell(11)?.value || "",
      });
    }

    if (bulk.length > 0) {
      await FuelVinhKhuc.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({
      success: true,
      totalValid, // số dòng có số xe
      inserted,   // số dòng đã import
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

