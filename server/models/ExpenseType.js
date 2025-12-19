// models/ExpenseType.js
const mongoose = require("mongoose");

const expenseTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,   // không cho trùng tên
      trim: true
    },
  }
);

module.exports = mongoose.model("ExpenseType", expenseTypeSchema);
