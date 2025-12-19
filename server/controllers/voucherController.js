const Voucher = require("../models/Voucher");

// =========================
//  TẠO PHIẾU
// =========================
const generateVoucherCode = async (date) => {
  const d = date ? new Date(date) : new Date();

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);

  // lấy ngày đầu & cuối tháng
  const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

  // đếm số phiếu trong tháng
  const count = await Voucher.countDocuments({
    dateCreated: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  });

  const index = String(count + 1).padStart(3, "0");

  return `PC.${month}.${year}.${index}`;
};


exports.createVoucher = async (req, res) => {
  try {
    const data = req.body;

    const dateCreated = data.dateCreated
      ? new Date(data.dateCreated)
      : new Date();

    // 🔹 BE tự sinh mã
    const voucherCode = await generateVoucherCode(dateCreated);

    const v = new Voucher({
      ...data,
      voucherCode,              // gán mã tại đây
      dateCreated,
      status: "waiting_check",  // trạng thái mặc định
    });

    const saved = await v.save();
    res.json(saved);

  } catch (err) {
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

    const list = await Voucher.find(filter)
      .sort({ dateCreated: -1 })
      .lean(); // chuyển thành object thường để sửa thêm

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
      return res.status(400).json({ error: "Phiếu không ở trạng thái chờ duyệt" });

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
    if (!orig)
      return res.status(404).json({ error: "Phiếu gốc không tồn tại" });

    const data = req.body;

    // 🔹 sinh mã phiếu mới cho phiếu điều chỉnh
    const voucherCode = await generateVoucherCode(
      data.dateCreated || new Date()
    );

    const newVoucher = new Voucher({
      ...data,
      voucherCode,                 // ✅ BẮT BUỘC
      adjustedFrom: orig._id,       // liên kết phiếu gốc
      origVoucherCode: orig.voucherCode, //lưu voucherCode của phiếu gốc
      dateCreated: data.dateCreated
        ? new Date(data.dateCreated)
        : new Date(),
      status: "waiting_check",
    });

    const saved = await newVoucher.save();
    res.json(saved);

  } catch (err) {
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
    if (!adj) return res.status(404).json({ error: "Không tìm thấy phiếu điều chỉnh" });

    if (adj.status !== "waiting_check")
      return res.status(400).json({ error: "Phiếu điều chỉnh không ở trạng thái chờ duyệt" });

    if (!adj.adjustedFrom)
      return res.status(400).json({ error: "Phiếu này không phải phiếu điều chỉnh" });

    const orig = await Voucher.findById(adj.adjustedFrom);
    if (!orig) return res.status(404).json({ error: "Phiếu gốc không tồn tại" });

    // 🔁 ĐÈ DỮ LIỆU (GIỮ LẠI voucherCode)
    const fieldsToOverwrite = [
      "paymentSource",
      "receiverName",
      "receiverCompany",
      "receiverBankAccount",
      "transferContent",
      "reason",
      "expenseType",
      "amount",
      "amountInWords",
      "note"
    ];

    fieldsToOverwrite.forEach(f => {
      if (adj[f] !== undefined) {
        orig[f] = adj[f];
      }
    });

    orig.status = "approved";   // vẫn là phiếu hợp lệ
    await orig.save();

    // 🔥 ĐÁNH DẤU PHIẾU GỐC ĐÃ BỊ ĐIỀU CHỈNH (LỊCH SỬ)
    await Voucher.updateOne(
      { _id: orig._id },
      { $set: { status: "adjusted" } }
    );

    // ❌ XOÁ PHIẾU ĐIỀU CHỈNH
    await adj.deleteOne();

    res.json({
      success: true,
      message: "Đã duyệt điều chỉnh, phiếu gốc được cập nhật",
      voucher: orig
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

