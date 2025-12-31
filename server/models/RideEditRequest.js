const mongoose = require("mongoose");

const rideEditRequestSchema = new mongoose.Schema(
  {
    rideID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleAdmin",
      required: true,
    },

    requestedByID: { type: String, required: true },
    requestedBy: { type: String, required: true },

    // Dữ liệu user đề nghị thay đổi (ý định)
    changes: {
      type: Object,
      required: true,
    },

    // 🔥 DIFF THẬT – chỉ sinh ra khi approve
    changedFields: {
      type: Map,
      of: new mongoose.Schema(
        {
          old: mongoose.Schema.Types.Mixed,
          new: mongoose.Schema.Types.Mixed,
        },
        { _id: false }
      ),
      default: {},
    },

    // Lý do gửi yêu cầu
    reason: { type: String, default: "" },

    // pending | approved | rejected
    status: { type: String, default: "pending" },

    // Nếu bị từ chối
    rejectNote: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RideEditRequest", rideEditRequestSchema);
