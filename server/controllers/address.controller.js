const ExcelJS = require("exceljs");
const Address = require("../models/Address");

/**
 * =========================
 * GET ALL (PAGINATION)
 * =========================
 * GET /api/addresses?page=1&limit=200
 */
const normalizeKeywordToRegex = (keyword = "") => {
  let k = keyword.toLowerCase();

  // bỏ dấu câu & khoảng trắng
  k = k.replace(/[^a-z0-9]/gi, "");

  const map = {
    a: "[aàáạảãâầấậẩẫăằắặẳẵ]",
    e: "[eèéẹẻẽêềếệểễ]",
    i: "[iìíịỉĩ]",
    o: "[oòóọỏõôồốộổỗơờớợởỡ]",
    u: "[uùúụủũưừứựửữ]",
    y: "[yỳýỵỷỹ]",
    d: "[dđ]",
  };

  let regex = "";
  for (const char of k) {
    regex += map[char] || char;
    regex += "[^a-z0-9]*"; // cho phép chen dấu , . space -
  }

  return regex;
};

exports.getAddressesPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 200, 1);
    const skip = (page - 1) * limit;

    const keyword = (req.query.keyword || "").trim();

    // Không search → sort bình thường
    if (!keyword) {
      const [data, total] = await Promise.all([
        Address.find().sort({ diaChi: 1 }).skip(skip).limit(limit).lean(),
        Address.countDocuments(),
      ]);

      return res.json({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const regexStr = normalizeKeywordToRegex(keyword);
    const regex = new RegExp(regexStr, "i");

    const pipeline = [
      {
        // lọc trước cho nhẹ
        $match: {
          $or: [{ diaChi: regex }, { diaChiMoi: regex }, { ghiChu: regex }],
        },
      },

      {
        // chấm điểm
        $addFields: {
          score: {
            $add: [
              {
                $cond: [{ $regexMatch: { input: "$diaChi", regex } }, 5, 0],
              },
              {
                $cond: [{ $regexMatch: { input: "$diaChiMoi", regex } }, 3, 0],
              },
              {
                $cond: [{ $regexMatch: { input: "$ghiChu", regex } }, 1, 0],
              },
            ],
          },
        },
      },

      // sort theo độ khớp trước
      { $sort: { score: -1, diaChi: 1 } },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await Address.aggregate(pipeline);

    const data = result[0]?.data || [];
    const total = result[0]?.total[0]?.count || 0;

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
 * GET ALL (NO PAGINATION)
 * =========================
 * GET /api/addresses/all
 */
exports.getAllAddresses = async (req, res) => {
  try {
    const data = await Address.find().sort({ diaChi: 1 }).lean();

    res.json({
      data,
      total: data.length,
    });
  } catch (err) {
    console.error("GET ALL ADDRESSES ERROR:", err);
    res.status(500).json({ message: "Lỗi lấy toàn bộ địa chỉ" });
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
    const mode = req.body.mode || "insert"; // insert | overwrite

    if (!req.file) {
      return res.status(400).json({ message: "Chưa upload file Excel" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: "File Excel không có sheet" });
    }

    const rows = [];

    // A: diaChi | B: diaChiMoi | C: ghiChu
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const rawDiaChi = row.getCell(1).value;
      if (!rawDiaChi) continue;

      rows.push({
        diaChi: String(rawDiaChi).trim(),
        diaChiMoi: row.getCell(2).value
          ? String(row.getCell(2).value).trim()
          : "",
        ghiChu: row.getCell(3).value ? String(row.getCell(3).value).trim() : "",
      });
    }

    if (!rows.length) {
      return res.status(400).json({ message: "Không có dữ liệu hợp lệ" });
    }

    // ❗ loại trùng trong file
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.diaChi)) map.set(r.diaChi, r);
    });

    const uniqueRows = Array.from(map.values());

    /**
     * ======================
     * INSERT MODE
     * ======================
     */
    if (mode === "insert") {
      let insertedCount = 0;
      let skippedCount = 0;

      try {
        const result = await Address.insertMany(uniqueRows, {
          ordered: false,
        });

        insertedCount = result.length;
      } catch (err) {
        if (err.code === 11000) {
          // Mongo vẫn insert được các bản ghi hợp lệ
          insertedCount = err.result?.nInserted || 0;
          skippedCount = uniqueRows.length - insertedCount;
        } else {
          throw err;
        }
      }

      return res.json({
        message:
          skippedCount > 0
            ? "Import xong – một số địa chỉ bị trùng đã được bỏ qua"
            : "Import thêm mới thành công",
        inserted: insertedCount,
        skipped: skippedCount,
        total: uniqueRows.length,
      });
    }

    /**
     * ======================
     * OVERWRITE MODE
     * ======================
     */
    const bulkOps = uniqueRows.map((item) => ({
      updateOne: {
        filter: { diaChi: item.diaChi },
        update: {
          $set: {
            diaChiMoi: item.diaChiMoi,
            ghiChu: item.ghiChu,
          },
          $setOnInsert: {
            diaChi: item.diaChi,
          },
        },
        upsert: true,
      },
    }));

    const result = await Address.bulkWrite(bulkOps);

    res.json({
      message: "Import ghi đè thành công",
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: uniqueRows.length,
    });
  } catch (err) {
    console.error("IMPORT ADDRESS ERROR:", err);
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
