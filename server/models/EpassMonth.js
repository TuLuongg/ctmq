const mongoose = require("mongoose");

const EpassMonthSchema = new mongoose.Schema({
  bienSoXe: { type: String, required: true },          // Biển số xe
  tramDoan: { type: String, required: true },            // Trạm / đoạn
  loaiVe: { type: String, default: '' },            // Trạm / đoạn
  moneyAmount: { type: Number, default: 0 },                  //Số tiền
  dayBuy: { type: Date, default: '' },           // Ngày mua
  dayTo: { type: Date, default: '' },           // Từ ngày
  dayFrom: { type: Date, default: '' },           // Đến ngày
});


const EpassMonth = mongoose.model("EpassMonth", EpassMonthSchema);

module.exports = EpassMonth;
