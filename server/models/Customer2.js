const mongoose = require("mongoose");

const Customer2Schema = new mongoose.Schema({
  nameKH: {
    type: String,
    required: true,
    unique: true,     // ❗ không trùng
    trim: true        // loại bỏ khoảng trắng đầu/cuối
  },
});

const Customer2 = mongoose.model("Customer2", Customer2Schema);

module.exports = Customer2;
