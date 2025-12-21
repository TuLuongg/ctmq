const mongoose = require("mongoose");

const ETCSchema = new mongoose.Schema({
  bsx: { type: String, default: '' },             //BIỂN SỐ XE
  xecoCB: { type: String, default: '' },             //XE CÓ CB
  dayBuy: { type: Date, default: '' },           // NGÀY MUA
  dayExp: { type: Date, default: '' },           // NGÀY HẾT HẠN
  timeUse: { type: Number, default: 0 },           // THỜI GIAN SỬ DỤNG
  phiGPS: { type: Number, default: 0 },           //DV MÁY CHỦ
  DVmaychu: { type: Number, default: 0 },           //PHÍ GPS / NĂM
  DVsimcard: { type: Number, default: 0 },           //DV SIM CARD
  camBienDau: { type: Number, default: 0 },           //CẢM BIẾN DẦU
  camHT: { type: Number, default: 0 },           //CAM HÀNH TRÌNH
  suaChua: { type: Number, default: 0 },           //SỬA CHỮA
  ghiChu: { type: String, default: '' },            //GHI CHÚ
  nameDV: { type: String, require: true },            //TÊN DỊCH VỤ
  nameCompany: { type: String, require: true },            //TÊN CÔNG TY XHĐ
  soHoaDon: { type: String, default: '' },            //SỐ HOÁ ĐƠN
  soHD: { type: String, default: '' },            //SỐ HỢP ĐỒNG
  dayBill: { type: Date, default: '' },           // NGÀY CHUYỂN TIỀN
});


const ETC = mongoose.model("ETC", ETCSchema);

module.exports = ETC;
