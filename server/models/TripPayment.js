const mongoose = require("mongoose");

const TripPaymentSchema = new mongoose.Schema(
  {
    maChuyenCode: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    createdDay: { type: Date, default: null },
    method: {
      type: String,
      enum: [
        "PERSONAL_VCB", // TK cá nhân - VCB
        "PERSONAL_TCB", // TK cá nhân - TCB
        "COMPANY_VCB", // VCB công ty
        "COMPANY_TCB", // TCB công ty
        "CASH", // Tiền mặt
        "OTHER", // Khác
      ],
      default: "CASH",
    },
    note: { type: String, default: "" },
    createdBy: { type: String }, // người tạo, nếu muốn
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripPayment", TripPaymentSchema);
