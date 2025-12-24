const mongoose = require("mongoose");

const vehiclePlateSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true },    // Tên biển
  company: { type: String, default: "" },          // Đơn vị vận tải
  vehicleType: { type: String, default: "" },      // Loại xe
  registrationImage: { type: [String], default: [] }, // Ảnh đăng ký (mảng link hoặc file)
  inspectionImage: { type: [String], default: [] },   // Ảnh đăng kiểm (mảng link hoặc file)
  length: { type: String, default: "" },           // Chiều dài xe
  width: { type: String, default: "" },            // Chiều rộng xe
  height: { type: String, default: "" },           // Chiều cao xe
  norm: { type: String, default: "" },             // Định mức
  warning: { type: Boolean, default: false },
  resDay: { type: Date, default: null },           // Ngày đăng kí
  resExpDay: { type: Date, default: null },        // Ngày hết hạn đăng kí
  insDay: { type: Date, default: null },           // Ngày đăng kiểm
  insExpDay: { type: Date, default: null },        // Ngày hết hạn đăng kiểm
  dayTravel: { type: Date, default: null },        // Giấy đi đường
  note: { type: String, default: "" },             // Ghi chú
}, { timestamps: true });

module.exports = mongoose.model("VehiclePlate", vehiclePlateSchema);
