const mongoose = require("mongoose");

const FuelNgocLongSchema = new mongoose.Schema({
  // ===== NGÀY =====
  dateFull: Date,        // Ngày Tháng Năm
  day: Number,           // Ngày

  // ===== XE =====
  vehiclePlate: String, // Biển số xe
  vehicleCode: String,  // Mã xe

  // ===== NHIÊN LIỆU =====
  amount: Number,       // Số tiền
  liter: Number,        // Số lít
  note: String,         // Ghi chú

  // ===== CỘNG DỒN SỐ CƠ =====
  cumulativeMechanical1: Number, // Cộng dồn lít số cơ máy 1
  cumulativeMechanical2: Number, // Cộng dồn lít số cơ máy 2

  // ===== CỘNG DỒN SỐ ĐIỆN TỬ (THIẾU TRƯỚC ĐÓ) =====
  cumulativeElectronic1: Number, // Cộng dồn lít số điện tử máy 1
  cumulativeElectronic2: Number, // Cộng dồn lít số điện tử máy 2

  // ===== GIÁ + TỒN =====
  internalFuelPrice: Number,     // Giá dầu nội bộ (đã VAT)
  fuelRemaining: Number          // Tồn dầu
}, { timestamps: true });

module.exports = mongoose.model(
  "FuelNgocLong",
  FuelNgocLongSchema
);
