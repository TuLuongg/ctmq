const Voucher = require("../models/Voucher");
const ExcelJS = require("exceljs");
const path = require("path");

// =========================
//  TẠO PHIẾU
// =========================
exports.createVoucher = async (req, res) => {
  try {
    const data = req.body;
    const attachments = req.body.attachments || [];

    const dateCreated = data.dateCreated
      ? new Date(data.dateCreated)
      : new Date();

    if (isNaN(dateCreated.getTime())) {
      return res.status(400).json({ error: "dateCreated không hợp lệ" });
    }

    const monthStr = String(dateCreated.getMonth() + 1).padStart(2, "0");
    const yearStr = String(dateCreated.getFullYear()).slice(-2);

    // ✅ REGEX đúng format PC.mm.yy.000
    const regex = new RegExp(`^PC\\.${monthStr}\\.${yearStr}\\.\\d{3}$`);

    let voucherCode;
    let retry = 0;
    const MAX_RETRY = 5;

    while (retry < MAX_RETRY) {
      const lastVoucher = await Voucher.findOne({ voucherCode: regex })
        .sort({ voucherCode: -1 })
        .lean();

      let nextNum = 1;
      if (lastVoucher?.voucherCode) {
        const parts = lastVoucher.voucherCode.split(".");
        nextNum = parseInt(parts[parts.length - 1], 10) + 1;
      }

      voucherCode = `PC.${monthStr}.${yearStr}.${String(nextNum).padStart(
        3,
        "0",
      )}`;

      try {
        const v = new Voucher({
          ...data,
          voucherCode,
          dateCreated,
          status: "waiting_check",
          attachments,
        });

        await v.save();
        return res.status(201).json(v);
      } catch (err) {
        if (err.code === 11000) {
          // 🔁 trùng mã → thử lại
          retry++;
          continue;
        }
        throw err;
      }
    }

    return res.status(409).json({
      error: "Không thể sinh mã phiếu, vui lòng thử lại",
    });
  } catch (err) {
    console.error("❌ Lỗi tạo phiếu:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  LẤY DANH SÁCH
// =========================
exports.getAllVouchers = async (req, res) => {
  try {
    const { month, year } = req.query;

    let filter = {};

    // Nếu có truyền month + year thì tạo khoảng ngày
    if (month && year) {
      const start = new Date(year, month - 1, 1, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59);
      // month,0 là ngày cuối của tháng

      filter.dateCreated = { $gte: start, $lte: end };
    }

    const list = await Voucher.find(filter).sort({ dateCreated: -1 }).lean(); // chuyển thành object thường để sửa thêm

    // Thêm voucherCode của phiếu gốc nếu có
    const listWithOrig = await Promise.all(
      list.map(async (v) => {
        if (v.adjustedFrom) {
          const orig = await Voucher.findById(v.adjustedFrom);
          if (orig) v.origVoucherCode = orig.voucherCode;
        }
        return v;
      }),
    );

    res.json(listWithOrig);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  LẤY THEO ID
// =========================
exports.getVoucherById = async (req, res) => {
  try {
    const v = await Voucher.findById(req.params.id);
    if (!v) return res.status(404).json({ error: "Không tìm thấy phiếu" });

    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  CẬP NHẬT PHIẾU
// =========================
exports.updateVoucher = async (req, res) => {
  try {
    const v = await Voucher.findById(req.params.id);
    if (!v) return res.status(404).json({ error: "Không tìm thấy phiếu" });
    if (v.status === "approved")
      return res.status(403).json({ error: "Phiếu đã duyệt, không thể sửa" });

    const data = req.body;

    const ALLOWED_FIELDS = [
      "dateCreated",
      "paymentSource",
      "receiverName",
      "receiverCompany",
      "receiverBankAccount",
      "transferContent",
      "reason",
      "expenseType",
      "amount",
      "amountInWords",
      "transferDate",
    ];

    ALLOWED_FIELDS.forEach((f) => {
      if (data[f] !== undefined && data[f] !== "") {
        v[f] = data[f];
      }
    });

    // ====== XỬ LÝ FILE ĐÍNH KÈM ======
    const oldAttachments = Array.isArray(req.body.oldAttachments)
      ? req.body.oldAttachments
      : [];

    const newAttachments = Array.isArray(req.body.attachments)
      ? req.body.attachments
      : [];

    v.attachments = [...oldAttachments, ...newAttachments];

    await v.save();
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  XOÁ PHIẾU
// =========================
exports.deleteVoucher = async (req, res) => {
  try {
    const v = await Voucher.findById(req.params.id);

    if (!v) return res.status(404).json({ error: "Không tìm thấy phiếu" });
    if (v.status === "approved")
      return res.status(403).json({ error: "Phiếu đã duyệt, không thể xoá" });

    await v.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  DUYỆT PHIẾU
// =========================
exports.approveVoucher = async (req, res) => {
  try {
    const v = await Voucher.findById(req.params.id);

    if (!v) return res.status(404).json({ error: "Không tìm thấy phiếu" });
    if (v.status !== "waiting_check")
      return res
        .status(400)
        .json({ error: "Phiếu không ở trạng thái chờ duyệt" });

    v.status = "approved";

    const saved = await v.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  TẠO PHIẾU ĐIỀU CHỈNH
// =========================
exports.adjustVoucher = async (req, res) => {
  try {
    const orig = await Voucher.findById(req.params.id);
    if (!orig) {
      return res.status(404).json({ error: "Phiếu gốc không tồn tại" });
    }

    const data = req.body;
    const attachments = req.body.attachments || [];

    // 🔹 Tìm phiếu điều chỉnh mới nhất của phiếu gốc
    const lastAdjust = await Voucher.findOne({
      adjustedFrom: orig._id,
    })
      .sort({ voucherCode: -1 })
      .lean();

    let nextIndex = 1;

    if (lastAdjust?.voucherCode) {
      // VD: PC.09.25.012.02
      const parts = lastAdjust.voucherCode.split(".");
      nextIndex = parseInt(parts[parts.length - 1], 10) + 1;
    }

    const voucherCode = `${orig.voucherCode}.${String(nextIndex).padStart(
      2,
      "0",
    )}`;

    const newVoucher = new Voucher({
      ...data,
      voucherCode, // ✅ PC.xx.yy.zzz.01
      adjustedFrom: orig._id,
      origVoucherCode: orig.voucherCode,
      dateCreated: data.dateCreated ? new Date(data.dateCreated) : new Date(),
      status: "waiting_check",
      attachments,
    });

    const saved = await newVoucher.save();
    res.json(saved);
  } catch (err) {
    console.error("adjustVoucher error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  IN PHIẾU
// =========================
exports.printVoucher = async (req, res) => {
  try {
    const v = await Voucher.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "waiting_check", // ✅ chỉ update nếu đang chờ
      },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(), // optional
        },
      },
      {
        new: true, // ✅ trả về bản đã update
      },
    );

    // nếu không update được (đã approved từ trước)
    const voucher = v || (await Voucher.findById(req.params.id));
    if (!voucher) {
      return res.status(404).json({ error: "Không tìm thấy phiếu" });
    }

    const formatted = {
      id: voucher._id,
      receiverCompany: voucher.receiverCompany,
      receiverBankAccount: voucher.receiverBankAccount,
      receiverName: voucher.receiverName,
      paymentSource: voucher.paymentSource,
      reason: voucher.reason,
      transferContent: voucher.transferContent,
      amount: voucher.amount,
      amountInWords: voucher.amountInWords,
      expenseType: voucher.expenseType,
      note: voucher.note,
      status: voucher.status, // ✅ ĐÃ LÀ approved
      dateCreated: voucher.dateCreated
        ? voucher.dateCreated.toLocaleString("vi-VN", { hour12: false })
        : null,
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  DUYỆT PHIẾU ĐIỀU CHỈNH
// =========================
exports.approveAdjustedVoucher = async (req, res) => {
  try {
    const adj = await Voucher.findById(req.params.id);
    if (!adj)
      return res.status(404).json({ error: "Không tìm thấy phiếu điều chỉnh" });

    if (adj.status !== "waiting_check")
      return res.status(400).json({
        error: "Phiếu điều chỉnh không ở trạng thái chờ duyệt",
      });

    if (!adj.adjustedFrom)
      return res.status(400).json({
        error: "Phiếu này không phải phiếu điều chỉnh",
      });

    // 1️⃣ Duyệt phiếu điều chỉnh
    await Voucher.updateOne({ _id: adj._id }, { $set: { status: "approved" } });

    // 2️⃣ ĐÁNH DẤU PHIẾU GỐC ĐÃ ĐIỀU CHỈNH (QUAN TRỌNG)
    const result = await Voucher.updateOne(
      { _id: adj.adjustedFrom },
      { $set: { status: "adjusted" } },
    );

    // debug chắc chắn
    if (result.modifiedCount === 0) {
      return res.status(500).json({
        error: "Không cập nhật được trạng thái phiếu gốc",
      });
    }

    const updatedOrig = await Voucher.findById(adj.adjustedFrom);

    res.json({
      success: true,
      message: "Đã duyệt phiếu điều chỉnh, phiếu gốc đã chuyển trạng thái",
      originalVoucher: updatedOrig,
    });
  } catch (err) {
    console.error("approveAdjustedVoucher error:", err);
    res.status(500).json({ error: err.message });
  }
};

//Cập nhật ngày chuyển tiền cho nhiều phiếu
exports.updateTransferDateBulk = async (req, res) => {
  try {
    const { voucherIds, transferDate } = req.body;

    if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
      return res.status(400).json({
        message: "voucherIds phải là mảng và không được rỗng",
      });
    }

    if (!transferDate) {
      return res.status(400).json({
        message: "Thiếu transferDate",
      });
    }

    const result = await Voucher.updateMany(
      { _id: { $in: voucherIds } },
      {
        $set: {
          transferDate: new Date(transferDate),
        },
      },
    );

    return res.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error("updateTransferDateBulk error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ==============================
// EXPORT DS PHIẾU (FORM MẪU)
// ==============================
exports.exportVouchers = async (req, res) => {
  try {
    const { fromMonth, toMonth } = req.query;
    if (!fromMonth || !toMonth)
      return res.status(400).json({ message: "Thiếu fromMonth hoặc toMonth" });

    const [fromY, fromM] = fromMonth.split("-").map(Number);
    const [toY, toM] = toMonth.split("-").map(Number);

    const start = new Date(fromY, fromM - 1, 1);
    const end = new Date(toY, toM, 0, 23, 59, 59, 999);

    const vouchers = await Voucher.find({
      dateCreated: { $gte: start, $lte: end },
    })
      .sort({ dateCreated: -1 })
      .lean();

    if (!vouchers.length)
      return res
        .status(400)
        .json({ message: "Không có dữ liệu phiếu trong khoảng này" });

    const templatePath = path.join(__dirname, "../templates/PHIEU_CHI.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.getWorksheet("Sheet1");
    if (!sheet)
      return res.status(500).json({ message: "Không tìm thấy sheet 'Sheet1'" });

    // Bản đồ enum sang tiếng Việt
    const PAYMENT_SOURCE_LABEL = {
      PERSONAL_VCB: "TK cá nhân - VCB",
      PERSONAL_TCB: "TK cá nhân - TCB",
      COMPANY_VCB: "VCB công ty",
      COMPANY_TCB: "TCB công ty",
      CASH: "Tiền mặt",
      OTHER: "Khác",
    };

    const STATUS_LABEL = {
      waiting_check: "Đang chờ duyệt",
      approved: "Đã duyệt",
      adjusted: "Đã điều chỉnh",
    };
    startRow = 2; // giả sử dữ liệu bắt đầu từ hàng 2
    vouchers.forEach((v, i) => {
      const row = sheet.getRow(startRow + i);

      row.getCell("A").value = i + 1; // index
      row.getCell("B").value = v.dateCreated ? new Date(v.dateCreated) : null;
      row.getCell("C").value = v.voucherCode || null;

      // ✅ chuyển enum sang tiếng Việt
      row.getCell("D").value =
        PAYMENT_SOURCE_LABEL[v.paymentSource] || v.paymentSource;
      row.getCell("E").value = v.receiverName || null;
      row.getCell("F").value = v.receiverCompany || null;
      row.getCell("G").value = v.transferContent || null;
      row.getCell("H").value = v.reason || null;
      row.getCell("I").value = v.transferDate ? new Date(v.transferDate) : null;
      row.getCell("J").value = v.amount != null ? v.amount : null;
      row.getCell("K").value = v.expenseType || null;

      // ✅ chuyển status sang tiếng Việt
      row.getCell("L").value = STATUS_LABEL[v.status] || v.status;
      row.getCell("M").value = v.receiverBankAccount || null;

      row.commit();
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=PHIEU_${fromMonth}_to_${toMonth}.xlsx`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Export vouchers error:", err);
    res.status(500).json({ message: "Lỗi xuất danh sách phiếu" });
  }
};

// =========================
//  LẤY DS PHÂN LOẠI CHI (UNIQUE)
// =========================
exports.getUniqueExpenseTypes = async (req, res) => {
  try {
    const expenseTypes = await Voucher.distinct("expenseType", {
      expenseType: { $ne: null },
    });

    res.json(expenseTypes);
  } catch (err) {
    console.error("getUniqueExpenseTypes error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  LẤY DS CÔNG TY NGƯỜI NHẬN (UNIQUE)
// =========================
exports.getUniqueReceiverCompanies = async (req, res) => {
  try {
    const companies = await Voucher.distinct("receiverCompany", {
      receiverCompany: { $ne: null },
    });

    res.json(companies);
  } catch (err) {
    console.error("getUniqueReceiverCompanies error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
//  LẤY DS NGƯỜI NHẬN (UNIQUE THEO TỔ HỢP)
// =========================
exports.getUniqueReceivers = async (req, res) => {
  try {
    const list = await Voucher.aggregate([
      {
        // bỏ các bản ghi rỗng hoàn toàn
        $match: {
          $or: [
            { receiverName: { $ne: null, $ne: "" } },
            { receiverCompany: { $ne: null, $ne: "" } },
            { receiverBankAccount: { $ne: null, $ne: "" } },
          ],
        },
      },
      {
        // group theo tổ hợp 3 field
        $group: {
          _id: {
            receiverName: "$receiverName",
            receiverCompany: "$receiverCompany",
            receiverBankAccount: "$receiverBankAccount",
          },
        },
      },
      {
        // trả lại dạng object phẳng
        $project: {
          _id: 0,
          receiverName: "$_id.receiverName",
          receiverCompany: "$_id.receiverCompany",
          receiverBankAccount: "$_id.receiverBankAccount",
        },
      },
      {
        // sort cho đẹp (optional)
        $sort: {
          receiverCompany: 1,
          receiverName: 1,
        },
      },
    ]);

    res.json(list);
  } catch (err) {
    console.error("getUniqueReceivers error:", err);
    res.status(500).json({ error: err.message });
  }
};

const https = require("https");
const http = require("http");

// =========================
//  TẢI FILE ĐÍNH KÈM (CLOUDINARY - NO AXIOS)
// =========================
exports.downloadVoucherAttachment = async (req, res) => {
  try {
    const { id, index } = req.params;

    const voucher = await Voucher.findById(id).lean();
    if (!voucher)
      return res.status(404).json({ error: "Không tìm thấy phiếu" });

    const attachment = voucher.attachments?.[index];
    if (!attachment)
      return res.status(404).json({ error: "Không tìm thấy file đính kèm" });

    const fileName = attachment.originalName; // 🔥 đã có .xlsx / .jpg

    const client = attachment.url.startsWith("https") ? https : http;

    client
      .get(attachment.url, (cloudRes) => {
        // lỗi cloudinary
        if (cloudRes.statusCode !== 200) {
          console.error("Cloudinary error:", cloudRes.statusCode);
          return res
            .status(502)
            .json({ error: "Không tải được file từ cloud" });
        }

        // MIME chuẩn
        res.setHeader(
          "Content-Type",
          attachment.mimeType || cloudRes.headers["content-type"],
        );

        // ⚠️ filename* để không lỗi tiếng Việt + giữ đuôi
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        );

        cloudRes.pipe(res);
      })
      .on("error", (err) => {
        console.error("Download cloud file error:", err);
        res.status(500).json({ error: "Lỗi tải file" });
      });
  } catch (err) {
    console.error("downloadVoucherAttachment error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};
