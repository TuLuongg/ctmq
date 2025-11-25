const mongoose = require("mongoose");

const rideEditRequestSchema = new mongoose.Schema(
  {
    rideID: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduleAdmin", required: true },

    requestedByID: { type: String, required: true },
    requestedBy: { type: String, required: true },

    // Các field đề nghị thay đổi
    changes: { type: Object, required: true },

    // Lý do gửi yêu cầu
    reason: { type: String, default: "" },

    // pending | approved | rejected
    status: { type: String, default: "pending" },

    // Nếu bị từ chối có thể note lý do
    rejectNote: { type: String, default: "" },
  },
  { timestamps: true }
);

const RideEditRequest = mongoose.model("RideEditRequest", rideEditRequestSchema);
module.exports = RideEditRequest;
