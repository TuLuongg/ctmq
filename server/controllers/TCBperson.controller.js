const TCBperson = require("../models/TCBperson");
const ExcelJS = require("exceljs");

// Helper parse ngày từ Excel
const parseExcelDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (!isNaN(d)) return d;
  const parts = val.split("/");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const parsed = new Date(`${yyyy}-${mm}-${dd}`);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
};

// Helper parse số
const parseNumber = (val) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const parseSTT = (maGD) => Number(maGD.split(".")[2]);
const buildPrefix = (date) => {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}.${yy}`;
};

// ===================
// Thêm mới
// ===================
exports.create = async (req, res) => {
  const session = await TCBperson.startSession();
  session.startTransaction();

  try {
    const { timePay, noiDungCK, soTien, khachHang, keToan, ghiChu, maChuyen } =
      req.body;

    const date = parseExcelDate(timePay) || new Date();
    const prefix = buildPrefix(date);

    // Lấy giao dịch cuối cùng trong THÁNG
    const lastInMonth = await TCBperson.findOne(
      { maGD: { $regex: `^${prefix}` } },
      {},
      { sort: { maGD: -1 }, session }
    );

    let stt = 1;
    let soDuTruoc = 0;

    if (lastInMonth) {
      stt = parseSTT(lastInMonth.maGD) + 1;
      soDuTruoc = lastInMonth.soDu;
    } else {
      // không có tháng này → lấy số dư gần nhất trước đó
      const lastAny = await TCBperson.findOne(
        {},
        {},
        { sort: { timePay: -1 }, session }
      );
      soDuTruoc = lastAny?.soDu || 0;
    }

    const newItem = await TCBperson.create(
      [
        {
          timePay: date,
          maGD: `${prefix}.${String(stt).padStart(4, "0")}`,
          noiDungCK,
          soTien: parseNumber(soTien),
          soDu: soDuTruoc + parseNumber(soTien),
          khachHang,
          keToan,
          ghiChu,
          maChuyen,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, data: newItem[0] });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

//Chèn giao dịch
exports.insertAfter = async (req, res) => {
  const session = await TCBperson.startSession();
  session.startTransaction();

  try {
    const { anchorId } = req.params;
    const { timePay, noiDungCK, soTien, khachHang, keToan, ghiChu, maChuyen } =
      req.body;

    const anchor = await TCBperson.findById(anchorId).session(session);
    if (!anchor) {
      throw new Error("Không tìm thấy giao dịch mốc");
    }

    const prefix = buildPrefix(anchor.timePay);
    const anchorSTT = parseSTT(anchor.maGD);

    /** =============================
     * 1. ĐẨY STT +1 (CÙNG THÁNG)
     ============================= */
    const laterRecords = await TCBperson.find(
      {
        maGD: { $regex: `^${prefix}` },
        $expr: {
          $gt: [{ $toInt: { $substr: ["$maGD", 6, 10] } }, anchorSTT],
        },
      },
      {},
      { sort: { maGD: -1 }, session }
    );

    for (const r of laterRecords) {
      const stt = parseSTT(r.maGD) + 1;
      r.maGD = `${prefix}.${String(stt).padStart(4, "0")}`;
      await r.save({ session });
    }

    /** =============================
     * 2. TẠO GIAO DỊCH MỚI
     ============================= */
    const newSTT = anchorSTT + 1;
    const newSoDu = anchor.soDu + parseNumber(soTien);

    const newItem = await TCBperson.create(
      [
        {
          timePay: timePay ? parseExcelDate(timePay) : anchor.timePay,
          maGD: `${prefix}.${String(newSTT).padStart(4, "0")}`,
          noiDungCK,
          soTien: parseNumber(soTien),
          soDu: newSoDu,
          khachHang,
          keToan,
          ghiChu,
          maChuyen,
        },
      ],
      { session }
    );

    /** =============================
     * 3. CẬP NHẬT LẠI SỐ DƯ PHÍA SAU
     ============================= */
    let runningSoDu = newSoDu;

    const afterAll = await TCBperson.find(
      {
        maGD: { $regex: `^${prefix}` },
        $expr: {
          $gt: [{ $toInt: { $substr: ["$maGD", 6, 10] } }, newSTT],
        },
      },
      {},
      { sort: { maGD: 1 }, session }
    );

    for (const r of afterAll) {
      runningSoDu += r.soTien;
      r.soDu = runningSoDu;
      await r.save({ session });
    }

    await session.commitTransaction();
    res.json({ success: true, data: newItem[0] });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ===================
// Sửa
// ===================
exports.update = async (req, res) => {
  const session = await TCBperson.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { timePay, noiDungCK, soTien, khachHang, keToan, ghiChu, maChuyen } =
      req.body;

    const record = await TCBperson.findById(id).session(session);
    if (!record) {
      throw new Error("Không tìm thấy giao dịch");
    }

    const oldSoTien = record.soTien;
    const newSoTien = parseNumber(soTien);
    const delta = newSoTien - oldSoTien;

    /** ======================
     * 1. UPDATE GIAO DỊCH HIỆN TẠI
     ====================== */
    record.timePay = timePay ? parseExcelDate(timePay) : record.timePay;
    record.noiDungCK = noiDungCK;
    record.soTien = newSoTien;
    record.khachHang = khachHang;
    record.keToan = keToan;
    record.ghiChu = ghiChu;
    record.maChuyen = maChuyen;

    record.soDu += delta;
    await record.save({ session });

    /** ======================
     * 2. REBUILD PHÍA SAU
     ====================== */
    const prefix = buildPrefix(record.timePay);
    const curSTT = parseSTT(record.maGD);

    const laterRecords = await TCBperson.find(
      {
        maGD: { $regex: `^${prefix}` },
        $expr: {
          $gt: [{ $toInt: { $substr: ["$maGD", 6, 10] } }, curSTT],
        },
      },
      {},
      { sort: { maGD: 1 }, session }
    );

    let runningSoDu = record.soDu;

    for (const r of laterRecords) {
      runningSoDu += r.soTien;
      r.soDu = runningSoDu;
      await r.save({ session });
    }

    await session.commitTransaction();
    res.json({ success: true, data: record });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ===================
// Xóa 1
// ===================
exports.deleteOne = async (req, res) => {
  const session = await TCBperson.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const record = await TCBperson.findById(id).session(session);
    if (!record) {
      throw new Error("Không tìm thấy bản ghi");
    }

    const prefix = buildPrefix(record.timePay);
    const curSTT = parseSTT(record.maGD);

    /** ======================
     * 1. XÓA GIAO DỊCH
     ====================== */
    await record.deleteOne({ session });

    /** ======================
     * 2. LẤY SỐ DƯ TRƯỚC ĐÓ
     ====================== */
    const prevRecord = await TCBperson.findOne(
      {
        maGD: { $regex: `^${prefix}` },
        $expr: {
          $lt: [{ $toInt: { $substr: ["$maGD", 6, 10] } }, curSTT],
        },
      },
      {},
      { sort: { maGD: -1 }, session }
    );

    let runningSoDu = prevRecord?.soDu || 0;

    /** ======================
     * 3. REBUILD PHÍA SAU + ĐẨY STT -1
     ====================== */
    const laterRecords = await TCBperson.find(
      {
        maGD: { $regex: `^${prefix}` },
        $expr: {
          $gt: [{ $toInt: { $substr: ["$maGD", 6, 10] } }, curSTT],
        },
      },
      {},
      { sort: { maGD: 1 }, session }
    );

    for (const r of laterRecords) {
      const newSTT = parseSTT(r.maGD) - 1;
      runningSoDu += r.soTien;

      r.maGD = `${prefix}.${String(newSTT).padStart(4, "0")}`;
      r.soDu = runningSoDu;

      await r.save({ session });
    }

    await session.commitTransaction();
    res.json({ success: true });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// ===================
// Xóa tất cả
// ===================
exports.deleteAll = async (req, res) => {
  try {
    await TCBperson.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Lấy danh sách khách hàng duy nhất
// ===================
exports.getCustomers = async (req, res) => {
  try {
    const customers = await TCBperson.distinct("khachHang");
    res.json({ success: true, data: customers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Lấy danh sách kế toán duy nhất
// ===================
exports.getAccountants = async (req, res) => {
  try {
    const accountants = await TCBperson.distinct("keToan");
    res.json({ success: true, data: accountants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Lấy tất cả data với lọc
// ===================
exports.getAll = async (req, res) => {
  try {
    const {
      // ===== ARRAY (GIỮ NGUYÊN) =====
      khachHang = [],
      keToan = [],

      // ===== STRING (LỌC ĐƠN) =====
      noiDungCK,
      ghiChu,
      maChuyen,

      // ===== NUMBER (LỌC ĐƠN) =====
      soTien,
      soDu,

      // ===== DATE RANGE =====
      from,
      to,

      // ===== PAGINATION =====
      page = 1,
    } = req.body;

    const filter = {};

    // ---------- ARRAY ----------
    if (khachHang.length) {
      filter.khachHang = { $in: khachHang };
    }

    if (keToan.length) {
      filter.keToan = { $in: keToan };
    }

    // ---------- STRING (đơn) ----------
    if (noiDungCK) {
      filter.noiDungCK = { $regex: noiDungCK, $options: "i" };
    }

    if (ghiChu) {
      filter.ghiChu = { $regex: ghiChu, $options: "i" };
    }

    if (maChuyen) {
      filter.maChuyen = { $regex: maChuyen, $options: "i" };
    }

    // ---------- NUMBER (đơn) ----------
    if (soTien !== undefined && soTien !== "") {
      filter.soTien = Number(soTien);
    }

    if (soDu !== undefined && soDu !== "") {
      filter.soDu = Number(soDu);
    }

    // ---------- DATE ----------
    if (from || to) {
      filter.timePay = {};
      if (from) filter.timePay.$gte = new Date(from);
      if (to) filter.timePay.$lte = new Date(to);
    }

    // ---------- PAGINATION ----------
    const pageSize = 100;
    const skip = (page - 1) * pageSize;

    const total = await TCBperson.countDocuments(filter);

    const data = await TCBperson.find(filter)
      .sort({ timePay: 1 })
      .skip(skip)
      .limit(pageSize);

    res.json({
      success: true,
      page: Number(page),
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ===================
// Import Excel
// ===================
exports.importExcel = async (req, res) => {
  const session = await TCBperson.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    /** ======================
     * 1. LẤY SỐ DƯ HIỆN TẠI (DB)
     ====================== */
    const lastRecord = await TCBperson.findOne(
      {},
      {},
      { sort: { timePay: -1 }, session }
    );

    let runningSoDu = lastRecord?.soDu || 0;
    let currentPrefix = null;
    let stt = 0;

    const bulk = [];

    /** ======================
     * 2. DUYỆT THEO THỨ TỰ EXCEL
     ====================== */
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      const timePay = parseExcelDate(row.getCell(2)?.value);
      const noiDungCK = row.getCell(3)?.value?.toString().trim() || "";
      const soTien = parseNumber(row.getCell(4)?.value);
      const khachHang = row.getCell(6)?.value?.toString().trim() || "";
      const keToan = row.getCell(7)?.value?.toString().trim() || "";
      const ghiChu = row.getCell(8)?.value?.toString().trim() || "";
      const maChuyen = row.getCell(9)?.value?.toString().trim() || "";

      if (!timePay || !noiDungCK || !khachHang) continue;

      const prefix = buildPrefix(timePay);

      /** ======================
       * 3. RESET STT KHI SANG THÁNG
       ====================== */
      if (prefix !== currentPrefix) {
        currentPrefix = prefix;

        const lastInMonth = await TCBperson.findOne(
          { maGD: { $regex: `^${prefix}` } },
          {},
          { sort: { maGD: -1 }, session }
        );

        stt = lastInMonth ? parseSTT(lastInMonth.maGD) : 0;
      }

      stt += 1;
      runningSoDu += soTien;

      bulk.push({
        timePay,
        maGD: `${prefix}.${String(stt).padStart(4, "0")}`,
        noiDungCK,
        soTien,
        soDu: runningSoDu,
        khachHang,
        keToan,
        ghiChu,
        maChuyen,
      });
    }

    /** ======================
     * 4. INSERT
     ====================== */
    if (bulk.length > 0) {
      await TCBperson.insertMany(bulk, { session });
    }

    await session.commitTransaction();
    res.json({ success: true, inserted: bulk.length });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};
