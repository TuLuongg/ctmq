const mongoose = require("mongoose");

const FuelVinhKhucSchema = new mongoose.Schema({
  dateFull: Date,            // Ngày Tháng Năm
  day: Number,               // Ngày
  vehicleNo: String,         // Số xe
  vehicleCode: String,       // Mã xe

  amount: Number,            // Số tiền
  liter: Number,             // Số lít

  outsideAmount: Number,     // Tiền đổ dầu ngoài
  outsideLiter: Number,      // Số lít đổ ngoài

  totalAmount: Number,       // Tổng cộng
  fuelPriceChanged: Number,  // Giá dầu thay đổi
  note: String
}, { timestamps: true });

module.exports = mongoose.model(
  "FuelVinhKhuc",
  FuelVinhKhucSchema
);
