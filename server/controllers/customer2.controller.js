const ExcelJS = require("exceljs");
const Customer2 = require("../models/Customer2");

/**
 * =========================
 * GET ALL (NO PAGINATION)
 * =========================
 * GET /api/customer2/all
 */
exports.getAllCustomer2 = async (req, res) => {
  try {
    const data = await Customer2.find().sort({ nameKH: 1 }).lean();

    res.json({
      data,
      total: data.length,
    });
  } catch (err) {
    console.error("GET ALL CUSTOMER2 ERROR:", err);
    res.status(500).json({ message: "Lỗi lấy danh sách khách hàng" });
  }
};

/**
 * =========================
 * CREATE
 * =========================
 * POST /api/customer2
 */
exports.createCustomer2 = async (req, res) => {
  try {
    const { nameKH } = req.body;

    if (!nameKH || !nameKH.trim()) {
      return res
        .status(400)
        .json({ message: "Tên khách hàng không được để trống" });
    }

    const customer = await Customer2.create({
      nameKH: nameKH.trim(),
    });

    res.json(customer);
  } catch (err) {
    console.error("CREATE CUSTOMER2 ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({ message: "Khách hàng đã tồn tại" });
    }

    res.status(500).json({ message: "Lỗi tạo khách hàng" });
  }
};

/**
 * =========================
 * DELETE ONE
 * =========================
 * DELETE /api/customer2/:id
 */
exports.deleteCustomer2 = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Customer2.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }

    res.json({ message: "Đã xoá khách hàng" });
  } catch (err) {
    console.error("DELETE CUSTOMER2 ERROR:", err);
    res.status(500).json({ message: "Lỗi xoá khách hàng" });
  }
};

/**
 * =========================
 * IMPORT EXCEL (KHÔNG XOÁ)
 * =========================
 * POST /api/customer2/import-excel
 */
exports.importCustomer2Excel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa upload file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: "File Excel không có sheet" });
    }

    const customers = [];

    // CỘT A (1): nameKH
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rawName = row.getCell(1).value;

      if (!rawName) continue;

      const nameKH = String(rawName).trim();
      if (!nameKH) continue;

      customers.push({ nameKH });
    }

    if (!customers.length) {
      return res.status(400).json({ message: "Không có dữ liệu hợp lệ" });
    }

    // 👉 loại trùng trong file
    const map = new Map();
    customers.forEach((item) => {
      if (!map.has(item.nameKH)) {
        map.set(item.nameKH, item);
      }
    });

    const uniqueCustomers = Array.from(map.values());

    // 👉 lấy toàn bộ nameKH đã tồn tại trong DB
    const existing = await Customer2.find(
      { nameKH: { $in: uniqueCustomers.map((c) => c.nameKH) } },
      { nameKH: 1 }
    ).lean();

    const existingSet = new Set(existing.map((e) => e.nameKH));

    // 👉 chỉ giữ lại nameKH chưa có trong DB
    const toInsert = uniqueCustomers.filter((c) => !existingSet.has(c.nameKH));

    if (!toInsert.length) {
      return res.json({
        message: "Không có khách hàng mới để import",
        inserted: 0,
        skipped: uniqueCustomers.length,
      });
    }

    await Customer2.insertMany(toInsert);

    res.json({
      message: "Import Excel thành công",
      inserted: toInsert.length,
      skipped: uniqueCustomers.length - toInsert.length,
      totalInFile: customers.length,
    });
  } catch (err) {
    console.error("IMPORT CUSTOMER2 ERROR:", err);
    res.status(500).json({ message: "Lỗi import Excel" });
  }
};

/**
 * =========================
 * CLEAR ALL
 * =========================
 * DELETE /api/customer2/clear
 */
exports.clearAllCustomer2 = async (req, res) => {
  try {
    const result = await Customer2.deleteMany({});

    res.json({
      message: "Đã xoá toàn bộ khách hàng",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("CLEAR CUSTOMER2 ERROR:", err);
    res.status(500).json({ message: "Lỗi xoá khách hàng" });
  }
};
