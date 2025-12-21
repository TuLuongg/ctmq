const ExcelJS = require("exceljs");
const ETC = require("../models/ETC");

/* =======================
   LẤY TẤT CẢ DỮ LIỆU CÓ FILTER THEO THÁNG
   query: ?month=12&year=2025
======================= */
exports.getAll = async (req, res) => {
  try {
    let { month, year } = req.query;
    const filter = {};

    if (month && year) {
      month = parseInt(month) - 1; // JS tháng 0-11
      year = parseInt(year);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);
      filter.dayBill = { $gte: start, $lt: end };
    }

    const data = await ETC.find(filter).sort({ dayBill: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH nameDV DUY NHẤT
======================= */
exports.getUniqueServices = async (req, res) => {
  try {
    const list = await ETC.distinct("nameDV");
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM 1 BẢN GHI
======================= */
exports.create = async (req, res) => {
  try {
    const data = await ETC.create(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   SỬA 1 BẢN GHI
======================= */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await ETC.findByIdAndUpdate(id, req.body, { new: true });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   XOÁ 1 BẢN GHI
======================= */
exports.remove = async (req, res) => {
  try {
    await ETC.findByIdAndDelete(req.params.id);
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
    await ETC.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL
   Dữ liệu giữ nguyên thứ tự theo model, không tính toán
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Không có file Excel" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const bulk = [];
    let totalValid = 0;

    // Chuyển giá trị cell an toàn
    const getCellString = (cell) => {
      if (!cell || cell.value === null || cell.value === undefined) return "";
      if (typeof cell.value === "object") {
        if ("result" in cell.value) {
          if (cell.value.result === null || cell.value.result === undefined) return "";
          if (typeof cell.value.result === "object" && "error" in cell.value.result) return "#N/A";
          return String(cell.value.result).trim();
        }
        if ("text" in cell.value) return cell.value.text?.trim() || "";
        return "";
      }
      return String(cell.value).trim();
    };

    const getCellNumber = (cell) => {
      if (!cell || cell.value === null || cell.value === undefined) return 0;
      if (typeof cell.value === "object" && "result" in cell.value) {
        if (typeof cell.value.result === "object" && "error" in cell.value.result) return 0;
        const num = Number(cell.value.result);
        return isNaN(num) ? 0 : num;
      }
      const num = Number(cell.value);
      return isNaN(num) ? 0 : num;
    };

    const getCellDate = (cell) => {
      if (!cell || cell.value === null || cell.value === undefined) return null;
      if (cell.value instanceof Date) return cell.value;
      if (typeof cell.value === "object" && "result" in cell.value && cell.value.result instanceof Date) 
        return cell.value.result;
      return null;
    };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      console.log("Row", i, row.values);

      const bsx = getCellString(row.getCell(2));
      const xecoCB = getCellString(row.getCell(3));
      const dayBuy = getCellDate(row.getCell(4));
      const dayExp = getCellDate(row.getCell(5));
      const timeUse = getCellNumber(row.getCell(6));
      const phiGPS = getCellNumber(row.getCell(7));
      const DVmaychu = getCellNumber(row.getCell(8));
      const DVsimcard = getCellNumber(row.getCell(9));
      const camBienDau = getCellNumber(row.getCell(10));
      const camHT = getCellNumber(row.getCell(11));
      const suaChua = getCellNumber(row.getCell(12));
      const ghiChu = getCellString(row.getCell(13));
      const nameDV = getCellString(row.getCell(14));
      const nameCompany = getCellString(row.getCell(15));
      const soHoaDon = getCellString(row.getCell(16));
      const soHD = getCellString(row.getCell(17));
      const dayBill = getCellDate(row.getCell(18));

      // Bỏ dòng thiếu thông tin bắt buộc
      if (!nameDV || !nameCompany) continue;

      totalValid++;
      bulk.push({
        bsx,
        xecoCB,
        dayBuy,
        dayExp,
        timeUse,
        phiGPS,
        DVmaychu,
        DVsimcard,
        camBienDau,
        camHT,
        suaChua,
        ghiChu,
        nameDV,
        nameCompany,
        soHoaDon,
        soHD,
        dayBill,
      });
    }

    let inserted = 0;
    if (bulk.length > 0) {
      await ETC.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, totalValid, inserted });
  } catch (err) {
    console.error("Import Excel Error:", err);
    res.status(500).json({ message: err.message });
  }
};
