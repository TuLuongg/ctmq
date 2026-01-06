const mongoose = require("mongoose");

const TCBpersonSchema = new mongoose.Schema({
  timePay: { type: Date, default: Date.now }, // Thời gian
  maGD: { type: String, unique: true }, // Mã giao dịch MM.YY.STT
  noiDungCK: { type: String, required: true }, // Nội dung chuyển khoản
  soTien: { type: Number, default: 0 }, // Số tiền (+/-)
  soDu: { type: Number, default: 0 }, // Số dư sau giao dịch
  khachHang: { type: String, default: "" },
  keToan: { type: String, default: "" },
  ghiChu: { type: String, default: "" },
  maChuyen: { type: String, default: "" },
  isLocked: {
    type: Boolean,
    default: false,
  },
});

const TCBperson = mongoose.model("TCBperson", TCBpersonSchema);

module.exports = TCBperson;
