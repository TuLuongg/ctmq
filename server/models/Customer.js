const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },           // Tên KH
  accountant: { type: String, trim: true },                     // Tên kế toán phụ trách
  code: { type: String, trim: true, unique: false },             // Mã KH
  accUsername: { type: String, trim: true, unique: true },         // Tên đăng nhập
  createdBy: { type: String, default: "" },           
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
