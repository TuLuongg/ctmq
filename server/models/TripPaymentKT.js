const mongoose = require("mongoose");

const TripPaymentKTSchema = new mongoose.Schema({
  tenLaiXe: { type: String, required: true },          //Tên lái xe
  bienSoXe: { type: String, required: true },            //Biển số xe
  ngayThang: { type: Date, default: '' },                    // Ngày tháng
  totalMoney: { type: Number, default: 0 },                  //Tổng tiền lịch trình
  ghiChu: { type: String },                              // Ghi chú
  dayPayment: { type: Date, default: '' },                    // Ngày thanh toán
});


const TripPaymentKT = mongoose.model("TripPaymentKT", TripPaymentKTSchema);

module.exports = TripPaymentKT;
