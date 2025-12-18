const mongoose = require("mongoose");

const PaymentReceiptSchema = new mongoose.Schema(
  {
    debtCode: { type: String, required: true },
    customerCode: { type: String, required: true },

    amount: { type: Number, required: true },

    method: {
      type: String,
      enum: [
        "PERSONAL_VCB",   // TK cá nhân - VCB
        "PERSONAL_TCB",   // TK cá nhân - TCB
        "COMPANY_VCB",    // VCB công ty
        "COMPANY_TCB",    // TCB công ty
        "CASH",           // Tiền mặt
        "OTHER",          // Khác
      ],
      default: "CASH",
    },

    note: { type: String },

    allocations: [
      {
        debtPeriodId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CustomerDebtPeriod",
        },
        amount: Number,
      },
    ],

    createdBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentReceipt", PaymentReceiptSchema);
