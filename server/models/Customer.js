const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },           // Tên KH
  nameHoaDon: { type: String, default: "" },      //Tên trên hoá đơn
  mstCCCD: { type: String, default: "" },        //MST / CCCD chủ hộ
  address: { type: String, default: "" },        //Địa chỉ
  accountant: { type: String, default: "" },                     // Tên kế toán phụ trách
  code: { type: String, trim: true, unique: false },             // Mã KH
  accUsername: { type: String, trim: true, unique: true },         // Tên đăng nhập
  createdBy: { type: String, default: "" },
  warning: { type: Boolean, default: false }          
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
