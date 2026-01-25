const mongoose = require("mongoose");

const scheduleCounterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

// 👇 ép tên collection để không đụng Counter cũ
module.exports = mongoose.model(
  "ScheduleCounter",
  scheduleCounterSchema,
  "schedule_counters"
);
