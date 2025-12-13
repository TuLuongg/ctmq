// models/CustomerDebtPeriod.js
const mongoose = require("mongoose");

const CustomerDebtPeriodSchema = new mongoose.Schema(
  {
    debtCode: { type: String, required: true, unique: true },

    customerCode: { type: String, required: true, index: true },

    // khoảng ngày kỳ công nợ
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },

    // tháng quản lý (để lọc)
    manageMonth: { type: String, required: true }, // vd "11/2025"

    // số liệu
    totalAmount: { type: Number, default: 0 }, // tổng cước
    paidAmount: { type: Number, default: 0 },  // đã trả
    remainAmount: { type: Number, default: 0 },// còn lại

    status: {
      type: String,
      enum: ["CHUA_TRA", "TRA_MOT_PHAN", "HOAN_TAT"],
      default: "CHUA_TRA",
    },

    note: { type: String, default: "" },

    // thêm vào schema
isLocked: { type: Boolean, default: false },
lockedAt: { type: Date },
lockedBy: { type: String },

  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CustomerDebtPeriod",
  CustomerDebtPeriodSchema
);
