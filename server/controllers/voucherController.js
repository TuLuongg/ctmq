const Voucher = require("../models/Voucher");

// =========================
//  TẠO PHIẾU
// =========================
exports.createVoucher = async (req, res) => {
  try {
    const data = req.body;

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
        "0"
      )}`;

      try {
        const v = new Voucher({
          ...data,
          voucherCode,
          dateCreated,
          status: "waiting_check",
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
      })
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
    const data = req.body;

    if (!v) return res.status(404).json({ error: "Không tìm thấy phiếu" });
    if (v.status === "approved")
      return res.status(403).json({ error: "Phiếu đã duyệt, không thể sửa" });

    // Cập nhật các trường FE gửi
    Object.assign(v, data);

    const saved = await v.save();
    res.json(saved);
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
      "0"
    )}`;

    const newVoucher = new Voucher({
      ...data,
      voucherCode, // ✅ PC.xx.yy.zzz.01
      adjustedFrom: orig._id,
      origVoucherCode: orig.voucherCode,
      dateCreated: data.dateCreated ? new Date(data.dateCreated) : new Date(),
      status: "waiting_check",
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
    const v = await Voucher.findById(req.params.id);
    if (!v) return res.status(404).json({ error: "Không tìm thấy phiếu" });

    const formatted = {
      id: v._id,
      receiverCompany: v.receiverCompany,
      receiverBankAccount: v.receiverBankAccount,
      receiverName: v.receiverName,
      paymentSource: v.paymentSource,
      reason: v.reason,
      transferContent: v.transferContent,
      amount: v.amount,
      amountInWords: v.amountInWords,
      expenseType: v.expenseType,
      note: v.note,
      status: v.status,
      dateCreated: v.dateCreated
        ? v.dateCreated.toLocaleString("vi-VN", { hour12: false })
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
      { $set: { status: "adjusted" } }
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
      }
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
