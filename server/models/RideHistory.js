const mongoose = require("mongoose");

const rideEditHistorySchema = new mongoose.Schema(
  {
    rideID: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduleAdmin", required: true },
    editedByID: { type: String, required: true },
    editedBy: { type: String, required: true },
    reason: { type: String, default: "" },
    previousData: { type: Object, required: true },
    newData: { type: Object, required: true },
  },
  { timestamps: true }
);

const RideEditHistory = mongoose.model("RideEditHistory", rideEditHistorySchema);
module.exports = RideEditHistory;
