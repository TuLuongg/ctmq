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
    vatPercent: { type: Number, default: 0, min: 0, max: 100 }, //VAT  %
    totalAmountInvoice: { type: Number, default: 0 }, // tổng cước hoá đơn
    totalAmountCash: { type: Number, default: 0 }, //tổng cước tiền mặt
    totalOther: { type: Number, default: 0 }, // khác
    totalAmount: { type: Number, default: 0 }, //tổng tất cả
    paidAmount: { type: Number, default: 0 }, // đã trả
    remainAmount: { type: Number, default: 0 }, // còn lại

    tripCount: { type: Number, default: 0 }, //số lượng chuyến trong kỳ

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

// ===============================
// 🔒 TỰ ĐỘNG CHUẨN HOÁ CÔNG NỢ
// ===============================
CustomerDebtPeriodSchema.pre("save", function (next) {
  this.totalAmount = Number(this.totalAmount || 0);
  this.paidAmount = Number(this.paidAmount || 0);

  // 🔥 remain LUÔN = total - paid
  this.remainAmount = Math.round(this.totalAmount - this.paidAmount);

  if (this.remainAmount <= 0) {
    this.remainAmount = 0;
    this.status = "HOAN_TAT";
  } else if (this.paidAmount > 0) {
    this.status = "TRA_MOT_PHAN";
  } else {
    this.status = "CHUA_TRA";
  }

  next();
});


module.exports = mongoose.model("CustomerDebtPeriod", CustomerDebtPeriodSchema);
