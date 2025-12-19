const mongoose = require("mongoose");

const receiverCompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,   // không cho trùng
      trim: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReceiverCompany", receiverCompanySchema);