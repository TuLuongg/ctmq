const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  customerCode: { type: String, required: true },  // maKH
  amount: { type: Number, required: true },        // số tiền thanh toán
  method: { type: String, enum: ["CaNhan", "VCB", "TCB"], default: "CaNhan" },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PaymentHistory", paymentSchema);
