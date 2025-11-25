// models/Driver.js
const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // tên
    nameZalo: { type: String, default: "" }, // tên Zalo
    birthYear: { type: Number }, // năm sinh
    company: { type: String, default: "" }, // đơn vị vận tải
    bsx: { type: String, default: "" }, // biển số xe
    phone: { type: String, default: "" }, // sđt
    hometown: { type: String, default: "" }, // quê quán
    resHometown: { type: String, default: "" }, // nơi đăng ký HKTT
    address: { type: String, default: "" }, // nơi ở hiện tại
    cccd: { type: String, default: "" }, // căn cước công dân
    cccdIssuedAt: { type: Date, default: null }, // ngày cấp cccd
    cccdExpiryAt: { type: Date, default: null }, // ngày hết hạn cccd
    licenseImageCCCD: { type: String, default: "" }, // đường dẫn file ảnh cccd (rel path)
    numberClass: { type: String, default: "" }, // số bằng lái
    licenseClass: { type: String, default: "" }, // hạng bằng lái
    licenseIssuedAt: { type: Date, default: null }, // ngày cấp blx
    licenseExpiryAt: { type: Date, default: null }, // ngày hết hạn blx
    licenseImage: { type: String, default: "" }, // đường dẫn file ảnh blx (rel path)
    numberHDLD: { type: String, default: "" }, // số hợp đồng lao động
    dayStartWork: { type: Date, default: null }, // ngày bắt đầu làm việc
    dayEndWork: { type: Date, default: null }, // ngày kết thúc làm việc
    createdBy: { type: String, default: "" }, // lưu username/fullname người tạo (tuỳ hệ thống auth)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
