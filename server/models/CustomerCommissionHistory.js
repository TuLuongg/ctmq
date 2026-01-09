const mongoose = require("mongoose");

const customerCommissionHistorySchema = new mongoose.Schema(
  {
    customerCode: { type: String, required: true, index: true },

    percentHH: { type: Number, default: 0 }, // % hoa hồng
    moneyPerTrip: { type: Number, default: 0 }, // tiền trừ thẳng / chuyến

    startDate: { type: Date, required: true }, // ngày bắt đầu áp dụng
    endDate: { type: Date, default: null }, // ngày kết thúc (auto)

    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CustomerCommissionHistory",
  customerCommissionHistorySchema
);
