const ExcelJS = require("exceljs");
const Address = require("../models/Address");

/**
 * =========================
 * GET ALL (PAGINATION)
 * =========================
 * GET /api/addresses?page=1&limit=200
 */
exports.getAddressesPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 200, 1);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Address.find().sort({ diaChi: 1 }).skip(skip).limit(limit).lean(),
      Address.countDocuments(),
    ]);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET ADDRESSES PAGINATED ERROR:", err);
    res.status(500).json({ message: "Lỗi lấy danh sách địa chỉ" });
  }
};

/**
 * =========================
 * IMPORT EXCEL (KHÔNG XOÁ)
 * =========================
 * POST /api/addresses/import-excel
 */
exports.importAddressExcel = async (req, res) => {
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

    const addresses = [];

    // 👉 bắt đầu từ hàng 2, lấy cột 1 (A)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const raw = row.getCell(1).value; // cột A

      const diaChi = String(raw || "")
        .trim()
        .toLowerCase();

      if (diaChi) {
        addresses.push({ diaChi });
      }
    }

    if (!addresses.length) {
      return res.status(400).json({ message: "Không có dữ liệu hợp lệ" });
    }

    // loại trùng trong file
    const map = new Map();
    addresses.forEach((i) => map.set(i.diaChi, i));
    const uniqueAddresses = Array.from(map.values());

    await Address.insertMany(uniqueAddresses);

    res.json({
      message: "Import Excel thành công",
      total: uniqueAddresses.length,
    });
  } catch (err) {
    console.error("IMPORT ADDRESS ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({ message: "Dữ liệu bị trùng" });
    }

    res.status(500).json({ message: "Lỗi import Excel" });
  }
};

/**
 * =========================
 * CLEAR ALL
 * =========================
 * DELETE /api/addresses/clear
 */
exports.clearAllAddresses = async (req, res) => {
  try {
    const result = await Address.deleteMany({});

    res.json({
      message: "Đã xoá toàn bộ địa chỉ",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("CLEAR ADDRESS ERROR:", err);
    res.status(500).json({ message: "Lỗi xoá địa chỉ" });
  }
};
