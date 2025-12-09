// models/Driver.js
const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // HỌ TÊN LÁI XE  
    nameZalo: { type: String, default: "" }, // TÊN ZALO
    birthYear: { type: Date }, // NĂM SINH
    company: { type: String, default: "" }, // ĐƠN VỊ VẬN TẢI
    bsx: { type: String, default: "" }, // BIỂN SỐ XE
    phone: { type: String, default: "" }, // SĐT
    hometown: { type: String, default: "" }, // QUÊ QUÁN
    resHometown: { type: String, default: "" }, // NƠI ĐĂNG KÝ HKTT
    address: { type: String, default: "" }, // NƠI Ở HIỆN TẠI
    cccd: { type: String, default: "" }, // CĂN CƯỚC CÔNG DÂN
    cccdIssuedAt: { type: Date, default: null }, // NGÀY CẤP CCCD
    cccdExpiryAt: { type: Date, default: null }, // NGÀY HẾT HẠN CCCD
    licenseImageCCCD: { type: String, default: "" }, // ĐƯỜNG DẪN FILE ẢNH CCCD (REL PATH)
    numberClass: { type: String, default: "" }, // SỐ BẰNG LÁI
    licenseClass: { type: String, default: "" }, // HẠNG BẰNG LÁI
    licenseIssuedAt: { type: Date, default: null }, // NGÀY CẤP BLX 
    licenseExpiryAt: { type: Date, default: null }, // NGÀY HẾT HẠN BLX
    licenseImage: { type: String, default: "" }, // ĐƯỜNG DẪN FILE ẢNH BLX (REL PATH)
    numberHDLD: { type: String, default: "" }, // SỐ HỢP ĐỒNG LAO ĐỘNG
    dayStartWork: { type: Date, default: null }, // NGÀY BẮT ĐẦU LÀM VIỆC
    dayEndWork: { type: Date, default: null }, // NGÀY KẾT THÚC LÀM VIỆC
    createdBy: { type: String, default: "" }, // LƯU USERNAME/FULLNAME NGƯỜI TẠO (TUỲ HỆ THỐNG AUTH)
    warning: { type: Boolean, default: false }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
