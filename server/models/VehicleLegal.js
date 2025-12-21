const mongoose = require("mongoose");

const VehicleLegalSchema = new mongoose.Schema({
  maCCDC: { type: String, required: true },              // Mã CCDC
  tenCCDE: { type: String, default: '' },                 // Tên CCDC
  bienSoXe: { type: String, required: true },            //Biển số xe
  typeCCDC: { type: String, default: '' },          // Loại CCDC
  reason: { type: String, default: '' },          //Lý do ghi tăng
  ngayGhiTang: { type: Date, default: "" },                  //Ngày ghi tăng
  soCT: { type: String, default: '' },                  //Số CT ghi tăng    
  soKyPB: { type: Number, default: 0 },                 //Số kỳ phân bổ
  soKyPBconlai: { type: Number, default: 0 },                //Số kỳ PB còn lại
  valueCCDC: { type: Number, default: 0 },             // Giá trị CCDC
  valuePB: { type: Number, default: 0 },          // Giá trị PB hàng kỳ
  pbk: { type: Number, default: 0 },             // Luỹ kế đã PB
  lkPB: { type: Number, default: 0 },              // Đơn giá lốp
  valueOld: { type: Number, default: 0 },                       // Giá trị còn lại
  tkPB: { type: String, default: '' }                               // TK chờ phân bổ
});


const VehicleLegal = mongoose.model("VehicleLegal", VehicleLegalSchema);

module.exports = VehicleLegal;
