const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({

  // ====== THÔNG TIN CƠ BẢN ======
  dateCreated: { type: Date, required: true },         // Ngày lập phiếu

  paymentSource: {                                     // Tài khoản chi
    type: String,
    enum: ["congTy", "caNhan"],
    required: true
  },

  receiverName: { type: String, required: true },      // Người nhận
  receiverCompany: { type: String, default: "" },      // Tên công ty nhận
  receiverBankAccount: { type: String, default: "" },  // Số TK nhận

  transferContent: { type: String, default: "" },      // Nội dung chuyển khoản
  reason: { type: String, default: "" },               // Lý do chi (ô dài)

  expenseType: { type: String, required: true },       // Phân loại chi
  amount: { type: Number, required: true },            // Số tiền
  amountInWords: { type: String, default: "" },        // Số tiền bằng chữ (auto)

  // ====== TRẠNG THÁI DUYỆT ======
  status: {
    type: String,
    enum: ["waiting_check", "approved"],
    default: "waiting_check"
  },

  // ====== PHIẾU ĐIỀU CHỈNH ======
  adjustedFrom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Voucher", 
    default: null 
  },

}, { timestamps: true });

module.exports = mongoose.model("Voucher", voucherSchema);
