const mongoose = require("mongoose");

const rideEditHistorySchema = new mongoose.Schema(
  {
    rideID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleAdmin",
      required: true,
    },

    // 👤 Người thực hiện thay đổi (system ghi nhận)
    editedByID: { type: String, required: true },
    editedBy: { type: String, required: true },

    // ✅ NGƯỜI PHÊ DUYỆT
    approvedByID: { type: String },   // hoặc ObjectId nếu user dùng ObjectId
    approvedBy: { type: String },

    reason: { type: String, default: "" },

    previousData: { type: Object, required: true },
    newData: { type: Object, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RideEditHistory", rideEditHistorySchema);
