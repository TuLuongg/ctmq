const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    // ====== MÃ PHIẾU ======
    voucherCode: {
      type: String,
      required: true,
      unique: true, // không trùng
      index: true,
    },

    // ====== THÔNG TIN CƠ BẢN ======
    dateCreated: { type: Date, required: true }, // Ngày lập phiếu
    transferDate: { type: Date, default: null }, //  Ngày chuyển tiền
    createByName: { type: String, required: true }, //người tạo mã

    paymentSource: {
      // Tài khoản chi
      type: String,
      enum: [
        "PERSONAL_VCB", // TK cá nhân - VCB
        "PERSONAL_TCB", // TK cá nhân - TCB
        "COMPANY_VCB", // VCB công ty
        "COMPANY_TCB", // TCB công ty
        "CASH", // Tiền mặt
        "OTHER", // Khác
      ],
      required: true,
    },

    receiverName: { type: String, required: true }, // Người nhận
    receiverCompany: { type: String, default: "" }, // Tên công ty nhận
    receiverBankAccount: { type: String, default: "" }, // Số TK nhận

    transferContent: { type: String, default: "" }, // Nội dung chuyển khoản
    reason: { type: String, default: "" }, // Lý do chi (ô dài)

    expenseType: { type: String, required: true }, // Phân loại chi
    amount: { type: Number, required: true }, // Số tiền
    amountInWords: { type: String, default: "" }, // Số tiền bằng chữ (auto)

    attachments: { type: [String], default: [] },

    // ====== TRẠNG THÁI DUYỆT ======
    status: {
      type: String,
      enum: ["waiting_check", "approved", "adjusted"],
      default: "waiting_check",
    },

    // ====== PHIẾU ĐIỀU CHỈNH ======
    adjustedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
    origVoucherCode: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
