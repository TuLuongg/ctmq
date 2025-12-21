const ExcelJS = require("exceljs");
const EpassTurn = require("../models/EpassTurn");

/* =========================
   GET ALL
========================= */
exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 150, 500);
    const skip = (page - 1) * limit;

    let { bienSoXe } = req.query;
    // Ép chắc chắn thành array
    if (!bienSoXe) {
      bienSoXe = [];
    } else if (typeof bienSoXe === "string") {
      bienSoXe = [bienSoXe]; // 1 xe
    } else if (Array.isArray(bienSoXe)) {
      // giữ nguyên
    } else {
      bienSoXe = [];
    }

    const filter = {};
    if (bienSoXe.length > 0) {
      filter.bienSoXe = { $in: bienSoXe };
    }

    const [data, total] = await Promise.all([
      EpassTurn.find(filter)
        .sort({ TimeActions: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EpassTurn.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   CREATE
========================= */
exports.create = async (req, res) => {
  try {
    const doc = await EpassTurn.create(req.body);
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   UPDATE
========================= */
exports.update = async (req, res) => {
  try {
    const doc = await EpassTurn.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   DELETE ONE
========================= */
exports.remove = async (req, res) => {
  try {
    await EpassTurn.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   DELETE ALL
========================= */
exports.removeAll = async (req, res) => {
  try {
    await EpassTurn.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   UNIQUE BSX (FILTER)
========================= */
exports.getUniqueBsx = async (req, res) => {
  try {
    const bsx = await EpassTurn.distinct("bienSoXe");
    res.json(bsx.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   IMPORT EXCEL
   THỨ TỰ CỘT:
   1. Mã GD
   2. Trạm vào
   3. Time In
   4. Trạm ra
   5. Time Out
   6. Time Actions
   7. Biển số xe
   8. Hình thức thu phí
   9. Loại vé
   10. Giá tiền
========================= */
const parseDate = (value) => {
  if (!value) return null;

  // Excel trả Date object
  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  // String dạng: 01/12/2025 06:20:39
  if (typeof value === "string") {
    const [datePart, timePart] = value.trim().split(" ");
    if (!datePart || !timePart) return null;

    const [day, month, year] = datePart.split("/");
    return new Date(`${year}-${month}-${day}T${timePart}`);
  }

  return null;
};

const parsePrice = (value) => {
  if (value === null || value === undefined) return 0;

  // Excel number
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }

  // String: "100.000" | "100,000" | " 100000 "
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }

  return 0;
};

exports.importExcel = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Chưa chọn file Excel" });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const docs = [];
    let inserted = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const v = row.values;

      const maGD = v[2];
      const TramVao = v[3];
      const TimeIn = v[4];
      const TramRa = v[5];
      const TimeOut = v[6];
      const TimeActions = v[7];
      const bienSoXe = v[8];
      const htThuPhi = v[9];
      const loaiVe = v[10];
      const price = v[11];

      if (!maGD || !bienSoXe) return;

      docs.push({
        maGD: String(maGD).trim(),
        TramVao: TramVao ? String(TramVao).trim() : "",
        TimeIn: parseDate(TimeIn),
        TramRa: TramRa ? String(TramRa).trim() : "",
        TimeOut: parseDate(TimeOut),
        TimeActions: parseDate(TimeActions),
        bienSoXe: String(bienSoXe).trim(),
        htThuPhi: htThuPhi ? String(htThuPhi).trim() : "",
        loaiVe: loaiVe ? String(loaiVe).trim() : "",
        price: parsePrice(price),
      });

      inserted++;
    });

    await EpassTurn.insertMany(docs);

    res.json({
      inserted,
      totalValid: docs.length,
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
