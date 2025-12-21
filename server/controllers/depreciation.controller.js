const ExcelJS = require("exceljs");
const Depreciation = require("../models/Depreciation");

/* =======================
   LẤY TẤT CẢ DỮ LIỆU CÓ THÊM FILTER
   query: ?maTSCDs=["31A-123","29C-456"]
======================= */
exports.getAll = async (req, res) => {
  try {
    const { maTSCDs } = req.query;
    const filter = {};

    if (maTSCDs) {
      let arr = [];
      try {
        arr = JSON.parse(maTSCDs);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        filter.maTSCD = { $in: arr };
      }
    }

    const data = await Depreciation.find(filter).sort({ maTSCD: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   LẤY DANH SÁCH maTSCD DUY NHẤT
======================= */
exports.getUniqueMaTSCD = async (req, res) => {
  try {
    const maTSCDs = await Depreciation.distinct("maTSCD");
    maTSCDs.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    res.json(maTSCDs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   THÊM 1 BẢN GHI
======================= */
exports.create = async (req, res) => {
  try {
    const data = await Depreciation.create(req.body);
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
    const data = await Depreciation.findByIdAndUpdate(id, req.body, {
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
    await Depreciation.findByIdAndDelete(req.params.id);
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
    await Depreciation.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =======================
   IMPORT EXCEL (THEO maTSCD)
   Ghi đè nếu trùng mã, thêm mới nếu chưa có
   Thứ tự cột:
   1 maTSCD | 2 tenTSCD | 3 ngayGhiTang | 4 soCT | 5 ngayStart
   6 timeSD | 7 timeSDremaining | 8 price | 9 valueKH
======================= */
exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Không có file Excel" });

    // mode: 1 = ghi đè | 2 = chỉ thêm mới
    const mode = Number(req.body.mode || 1);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    let totalValid = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const parseNumber = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const maTSCD = row.getCell(1)?.value;
      if (!maTSCD || String(maTSCD).trim() === "") continue;

      const data = {
        maTSCD: String(maTSCD).trim(),
        tenTSCD: row.getCell(2)?.value || "",
        ngayGhiTang: row.getCell(3)?.value
          ? new Date(row.getCell(3).value)
          : null,
        soCT: row.getCell(4)?.value || "",
        ngayStart: row.getCell(5)?.value
          ? new Date(row.getCell(5).value)
          : null,
        timeSD: parseNumber(row.getCell(6)?.value),
        timeSDremaining: parseNumber(row.getCell(7)?.value),
        price: parseNumber(row.getCell(8)?.value),
        valueKH: parseNumber(row.getCell(9)?.value),
      };

      totalValid++;

      const exist = await Depreciation.findOne({ maTSCD: data.maTSCD });

      // ===== MODE 1: GHI ĐÈ =====
      if (mode === 1) {
        if (exist) {
          await Depreciation.updateOne({ maTSCD: data.maTSCD }, data);
          updated++;
        } else {
          await Depreciation.create(data);
          inserted++;
        }
      }

      // ===== MODE 2: CHỈ THÊM MỚI =====
      else if (mode === 2) {
        if (exist) {
          skipped++;
        } else {
          await Depreciation.create(data);
          inserted++;
        }
      }
    }

    res.json({
      success: true,
      mode,
      totalValid,
      inserted,
      updated,
      skipped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

