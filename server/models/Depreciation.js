const mongoose = require("mongoose");

const DepreciationSchema = new mongoose.Schema({
  maTSCD: { type: String, required: true },          // Mã TSCĐ (biển số xe)
  tenTSCD: { type: String, required: true },            //Tên TSCĐ
  ngayGhiTang: { type: Date, default: '' },           // Ngày ghi tăng
  soCT: { type: String, default: '' },                 //Số CT ghi tăng
  ngayStart: { type: Date, default: '' },           // Ngày bắt đầu tính KH
  timeSD: { type: Number, default: 0 },                  //Thời gian SD (tháng)
  timeSDremaining: { type: Number, default: 0 },          //Thời gian SD còn lại (tháng)
  price: { type: Number, default: 0 },                  //Nguyên giá
  valueKH: { type: Number, default: 0 },                  //Giá trị KH tháng
});


const Depreciation = mongoose.model("Depreciation", DepreciationSchema);

module.exports = Depreciation;
