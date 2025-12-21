const mongoose = require("mongoose");

const TireSchema = new mongoose.Schema({
  nhaCungCap: { type: String, required: true },          // Nhà cung cấp
  ngay: { type: Date, default: '' },                    // Ngày tháng
  bienSoXe: { type: String, required: true },            //Biển số xe
  ruaXe: { type: Number, default: 0 },                  // Chi phí rửa xe
  bomMo: { type: Number, default: 0 },                  // Chi phí bơm mỡ
  canHoi: { type: Number, default: 0 },                 // Chi phí cân hơi
  catTham: { type: Number, default: 0 },                // Chi phí cắt thảm
  chiPhiKhac: { type: Number, default: 0 },             // Chi phí khác
  thayLopDoiLop: { type: String, default: '' },          // Chi phí thay/đổi lốp
  soLuongLop: { type: Number, default: 0 },             // Số lượng lốp
  donGiaLop: { type: Number, default: 0 },              // Đơn giá lốp
  thanhTienLop: { type: Number },                       // Thành tiền lốp
  tongChiPhi: { type: Number },                         // Tổng chi phí
  ghiChu: { type: String }                               // Ghi chú
});


const Tire = mongoose.model("Tire", TireSchema);

module.exports = Tire;
