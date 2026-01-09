const mongoose = require("mongoose");
const ScheduleAdmin = require("./ScheduleAdmin");

const customerSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, unique: false }, // Mã KH
    name: { type: String, required: true, trim: true }, // Tên KH
    nameHoaDon: { type: String, default: "" }, // Tên trên hoá đơn
    mstCCCD: { type: String, default: "" }, // MST / CCCD
    address: { type: String, default: "" }, // Địa chỉ
    accountant: { type: String, default: "" }, // Ghi chú
    accUsername: { type: String, trim: true, unique: true }, // Username
    createdBy: { type: String, default: "" },
    warning: { type: Boolean, default: false },

    percentHH: { type: Number, default: 0 }, // % HH hiện tại (áp cho chuyến mới)
    oneTripMoney: { type: Number, default: 0 }, //Tiền tính theo chuyến
    timeStart: { type: Date, default:''}  // Thời gian bắt đầu tính
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
