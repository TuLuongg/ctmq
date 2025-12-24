const mongoose = require("mongoose");

const TCBpersonSchema = new mongoose.Schema({
  timePay: { type: Date, default: '' },                     //Thời gian
  noiDungCK: { type: String, required: true },              //Nội dung chuyển khoản
  soTien: { type: Number, default: 0 },                     //Số tiền
  soDu: { type: Number, default: 0 },                       //Số dư
  khachHang: { type: String, required: true },              //Tên khách hàng chuyển khoản
  keToan: { type: String, default:'' },                    // Kế toán xác nhận
  ghiChu: { type: String, default:'' },                      // Ghi chú
  maChuyen: { type: String, default:'' },                      //Mã chuyến
});


const TCBperson = mongoose.model("TCBperson", TCBpersonSchema);

module.exports = TCBperson;
