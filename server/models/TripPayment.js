const mongoose = require("mongoose");

const TripPaymentSchema = new mongoose.Schema(
  {
    maChuyenCode: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["CaNhan", "VCB", "TCB"], default: "CaNhan" },
    note: { type: String, default: "" },
    createdBy: { type: String }, // người tạo, nếu muốn
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripPayment", TripPaymentSchema);
