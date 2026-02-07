const mongoose = require("mongoose");

const rowSchema = new mongoose.Schema({
  maLichTrinh: {
    type: String,
    unique: true,
    index: true,
  },
  bienSoXe: String,
  tenKhachHang: String,
  giayTo: String,
  noiDi: String,
  noiDen: String,
  trongLuongHang: String,
  soDiem: String,
  haiChieuVaLuuCa: String,
  an: String,
  tangCa: String,
  bocXep: String,
  ve: String,
  tienChuyen: String,
  chiPhiKhac: String,
  laiXeThuKhach: String,
  phuongAn: String,
});

const scheduleSchema = new mongoose.Schema(
  {
    tenLaiXe: String,
    ngayDi: Date,
    ngayVe: Date,
    tongTienLichTrinh: String,
    rows: [rowSchema], // Mảng các row, mỗi row chứa thông tin của một chuyến
  },
  { timestamps: true },
);

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;
