const Voucher = require("../models/Voucher");

// =========================
//  TẠO PHIẾU
// =========================
exports.createVoucher = async (req, res) => {
  try {
    const data = req.body;

    const v = new Voucher({
      ...data,
      dateCreated: data.dateCreated ? new Date(data.dateCreated) : new Date(),
      status: "waiting_check",   // trạng thái mặc định
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

    const list = await Voucher.find(filter).sort({ dateCreated: -1 });

    res.json(list);

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
    if (!orig) return res.status(404).json({ error: "Phiếu gốc không tồn tại" });

    const data = req.body;

    const newVoucher = new Voucher({
      ...data,
      adjustedFrom: orig._id,
      dateCreated: data.dateCreated ? new Date(data.dateCreated) : new Date(),
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
