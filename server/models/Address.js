const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  diaChi: {
    type: String,
    required: true,
    unique: true,     // ❗ không trùng
    trim: true        // loại bỏ khoảng trắng đầu/cuối
  },
});

const Address = mongoose.model("Address", AddressSchema);

module.exports = Address;
