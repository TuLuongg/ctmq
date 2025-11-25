const mongoose = require("mongoose");

const vehiclePlateSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true },    // Tên biển
  company: { type: String, default: "" },                        // Đơn vị vận tải
  vehicleType: { type: String, default: "" },                    // Loại xe
  registrationImage: { type: String, default: "" },               // Ảnh đăng ký (link hoặc file)
  inspectionImage: { type: String, default: "" },                // Ảnh đăng kiểm (link hoặc file)
  length: { type: String, default: "" },                         //Chiều dài xe
  width: { type: String, default: "" },                          //Chiều rộng xe
  height: { type: String, default: "" },                         //Chiều cao xe
  norm: { type: String, default: "" },                           // Định mức
}, { timestamps: true });

module.exports = mongoose.model("VehiclePlate", vehiclePlateSchema);
