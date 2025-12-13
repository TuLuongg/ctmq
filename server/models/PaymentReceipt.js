const mongoose = require("mongoose");

const PaymentReceiptSchema = new mongoose.Schema(
  {
    debtCode: { type: String, required: true }, //mã công nợ
    customerCode: { type: String, required: true },         //mã KH

    amount: { type: Number, required: true },
    method: { type: String, enum: ["CaNhan", "VCB", "TCB"], default: "CaNhan" },
    note: { type: String },

    // 🔗 PHÂN BỔ TIỀN
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
