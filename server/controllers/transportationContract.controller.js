const ExcelJS = require("exceljs");
const TransportationContract = require("../models/TransportationContract");

/* =======================
   LẤY TẤT CẢ DỮ LIỆU CÓ THÊM FILTER
   query: ?khachHangArr=["KH1","KH2"]
======================= */
exports.getAll = async (req, res) => {
  try {
    const { khachHangArr } = req.query;
    const filter = {};

    if (khachHangArr) {
      let arr = [];
      try {
        arr = JSON.parse(khachHangArr);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        filter.khachHang = { $in: arr };
      }
    }

    const data = await TransportationContract.find(filter).sort({ timeStart: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH khachHang DUY NHẤT
======================= */
exports.getUniqueCustomers = async (req, res) => {
  try {
    const customers = await TransportationContract.distinct("khachHang");
    customers.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM 1 BẢN GHI
======================= */
exports.create = async (req, res) => {
  try {
    const data = await TransportationContract.create(req.body);
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
    const data = await TransportationContract.findByIdAndUpdate(id, req.body, { new: true });
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
    await TransportationContract.findByIdAndDelete(req.params.id);
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
    await TransportationContract.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (THEO khachHang)
   Lưu ý: cột 2 trở đi, giữ thứ tự đúng model
======================= */
const parseExcelDate = (val) => {
  if (!val) return null;

  if (val instanceof Date) {
    // ExcelJS có thể trả Date object trực tiếp
    return val;
  }

  const strVal = val.toString().trim();
  if (!strVal) return null;

  const d = new Date(strVal);
  if (!isNaN(d)) return d;

  // thử parse format dd/mm/yyyy
  const parts = strVal.split("/");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const parsed = new Date(`${yyyy}-${mm}-${dd}`);
    if (!isNaN(parsed)) return parsed;
  }

  return null; // fallback
};

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

    const parseNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const khachHang = row.getCell(2)?.value?.toString().trim();
      const numberTrans = row.getCell(3)?.value?.toString().trim();
      if (!khachHang || !numberTrans) continue;

      totalValid++;

      bulk.push({
        khachHang,
        numberTrans,
        typeTrans: row.getCell(4)?.value || "",
        timeStart: parseExcelDate(row.getCell(5)?.value),
        timeEnd: parseExcelDate(row.getCell(6)?.value),
        timePay: parseExcelDate(row.getCell(7)?.value),
        yesOrNo: row.getCell(8)?.value || "",
        dayRequest: parseExcelDate(row.getCell(9)?.value),
        dayUse: parseExcelDate(row.getCell(10)?.value),
        price: parseNumber(row.getCell(11)?.value),
        numberPrice: row.getCell(12)?.value || "",
        daDuyet: row.getCell(13)?.value || "",
        ghiChu: row.getCell(14)?.value || "",
      });
    }

    if (bulk.length > 0) {
      await TransportationContract.insertMany(bulk);
      inserted = bulk.length;
    }

    res.json({ success: true, totalValid, inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
