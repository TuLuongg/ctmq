const mongoose = require("mongoose");

const EpassTurnSchema = new mongoose.Schema({
  maGD: { type: String, required: true },          // Mã giao dịch
  TramVao: { type: String, default: '' },          // Trạm vào
  TimeIn: { type: Date, default: '' },           // Thời gian trạm vào
  TramRa: { type: String, default: '' },          // Trạm ra
  TimeOut: { type: Date, default: '' },           // Thời gian trạm ra
  TimeActions: { type: Date, default: '' },           // Thời gian thực hiện giao dịch
  bienSoXe: { type: String, required: true },          // Biển số xe
  htThuPhi: { type: String, default: '' },            // Hình thức thu phí
  loaiVe: { type: String, default: '' },            // loại vé
  price: { type: Number, default: 0 },                  //Giá tiền
});


const EpassTurn = mongoose.model("EpassTurn", EpassTurnSchema);

module.exports = EpassTurn;
